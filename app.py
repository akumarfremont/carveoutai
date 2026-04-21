"""
CarveoutAI — Production Server
RAG with cross-model verification loop + multi-persona debate engine.
Deployed on Render free tier.
"""
import os, json, time, collections
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import chromadb
from chromadb.utils import embedding_functions
import anthropic
import openai

# ── Config from environment ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(SCRIPT_DIR, "carveout_db")
PORT = int(os.environ.get("PORT", 5111))

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

if not ANTHROPIC_API_KEY or not OPENAI_API_KEY:
    print("WARNING: API keys not set. Set ANTHROPIC_API_KEY and OPENAI_API_KEY environment variables.")

MODEL_SYNTH  = "claude-sonnet-4-20250514"
MODEL_VERIFY = "gpt-4o-mini"
MODEL_REFINE = "gpt-4o"

# ── Rate Limiting ──
RATE_LIMIT = int(os.environ.get("RATE_LIMIT_PER_HOUR", 20))  # requests per hour per IP
rate_buckets = collections.defaultdict(list)  # ip -> [timestamps]

def check_rate_limit():
    """Returns True if request is allowed, False if rate-limited."""
    ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    if ip:
        ip = ip.split(",")[0].strip()
    now = time.time()
    cutoff = now - 3600  # 1 hour window
    # Clean old entries
    rate_buckets[ip] = [t for t in rate_buckets[ip] if t > cutoff]
    if len(rate_buckets[ip]) >= RATE_LIMIT:
        return False
    rate_buckets[ip].append(now)
    return True

def rate_limit_response():
    return jsonify({
        "error": "Rate limit exceeded. Maximum {} requests per hour.".format(RATE_LIMIT),
        "retry_after_seconds": 3600
    }), 429

# ── Flask App ──
app = Flask(__name__)
CORS(app)

# ── Load ChromaDB ──
ef = embedding_functions.DefaultEmbeddingFunction()
client = chromadb.PersistentClient(path=DB_DIR)
collection = client.get_collection(name="carveout_kb", embedding_function=ef)

# ── LLM clients ──
claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
gpt = openai.OpenAI(api_key=OPENAI_API_KEY)


# ═══════════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════════

SYNTH_SYSTEM = """You are CarveoutAI, an expert research assistant specializing in carve-out financial statements under US GAAP.

You will receive a user question and retrieved passages from authoritative sources (Big 4 guides, SEC guidance, law firm memos, advisory publications).

Your job:
1. Synthesize a clear, authoritative answer using ONLY the provided source passages.
2. Cite sources inline using [Source: Firm - Title, p.X] format.
3. If sources disagree, highlight the differences.
4. If the passages don't fully answer the question, say so explicitly.
5. Structure your answer with **bold headings** where helpful.
6. Be thorough but concise — the audience is deal team members doing carveouts.
7. NEVER make up information not in the sources."""

VERIFY_SYSTEM = """You are a verification agent for CarveoutAI. Your job is to audit a draft answer for quality and accuracy.

You will receive:
- The original user question
- The source passages that were retrieved
- The draft synthesis answer

Evaluate the draft on these criteria and return a JSON object:

{
  "overall_score": 1-10,
  "citation_accuracy": {
    "score": 1-10,
    "issues": ["list of citation problems — wrong page, fabricated source, misattributed quote"]
  },
  "hallucination_check": {
    "score": 1-10,
    "issues": ["list of claims not supported by any source passage"]
  },
  "completeness": {
    "score": 1-10,
    "issues": ["list of important points in the sources that were missed"]
  },
  "clarity": {
    "score": 1-10,
    "issues": ["list of confusing or poorly structured sections"]
  },
  "needs_refinement": true/false,
  "refinement_instructions": "Specific instructions for improving the answer. Be precise about what to fix, add, or remove."
}

Be strict. If overall_score >= 8 and no hallucinations, set needs_refinement to false.
Return ONLY valid JSON, no other text."""

REFINE_SYSTEM = """You are CarveoutAI, refining a draft answer based on verification feedback.

You will receive:
- The original user question
- The source passages
- Your draft answer
- Specific verification feedback with issues to fix

Produce an improved final answer that:
1. Fixes all citation inaccuracies identified
2. Removes any hallucinated claims
3. Adds important points that were missed
4. Improves clarity where flagged
5. Maintains the same [Source: Firm - Title, p.X] citation format
6. Keeps the professional, concise tone for deal team members

Return ONLY the improved answer, no meta-commentary about what you changed."""


# ═══════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════

def build_where_clause(scope, firm=None):
    if scope == "single_firm" and firm:
        return {"firm": firm}
    elif scope == "all_big4":
        return {"category": "big4"}
    return None


def do_search(query, scope, firm, n_results):
    where = build_where_clause(scope, firm)
    kwargs = {"query_texts": [query], "n_results": min(n_results, 20)}
    if where:
        kwargs["where"] = where
    results = collection.query(**kwargs)

    hits = []
    if results and results["documents"] and results["documents"][0]:
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        dists = results["distances"][0] if results.get("distances") else [None] * len(docs)
        for doc, meta, dist in zip(docs, metas, dists):
            relevance = max(0, min(100, int(100 - (dist or 0) * 25)))
            hits.append({
                "text": doc,
                "firm": meta.get("firm", "Unknown"),
                "category": meta.get("category", "other"),
                "title": meta.get("title", ""),
                "year": meta.get("year", ""),
                "page": meta.get("page", 1),
                "source_file": meta.get("source_file", ""),
                "relevance": relevance,
            })
    return hits


def build_context(hits):
    parts = []
    for i, h in enumerate(hits, 1):
        parts.append(f"--- Source {i}: {h['firm']} - {h['title']} (p.{h['page']}, {h['year']}) [Category: {h['category']}] ---\n{h['text']}\n")
    return "\n".join(parts)


# ═══════════════════════════════════════════════════════════════
# SUB-AGENT PIPELINE
# ═══════════════════════════════════════════════════════════════

def agent_synthesize(query, context, scope, firm):
    user_msg = f"""Question: {query}

Research scope: {scope}{(' — ' + firm + ' only') if firm else ''}

Retrieved passages:
{context}

Please synthesize a comprehensive answer based on these sources."""

    resp = claude.messages.create(
        model=MODEL_SYNTH, max_tokens=2000, system=SYNTH_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )
    return resp.content[0].text


def agent_verify(query, context, draft):
    user_msg = f"""Original question: {query}

Source passages:
{context}

Draft answer to verify:
{draft}

Return your verification as JSON."""

    resp = gpt.chat.completions.create(
        model=MODEL_VERIFY, max_tokens=1000,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": VERIFY_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
    )
    raw = resp.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except:
        return {"overall_score": 7, "needs_refinement": False, "parse_error": raw[:200]}


def agent_refine(query, context, draft, verification):
    user_msg = f"""Original question: {query}

Source passages:
{context}

Draft answer to improve:
{draft}

Verification feedback:
{json.dumps(verification, indent=2)}

Please produce an improved final answer fixing all identified issues."""

    resp = gpt.chat.completions.create(
        model=MODEL_REFINE, max_tokens=2000,
        messages=[
            {"role": "system", "content": REFINE_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
    )
    return resp.choices[0].message.content


# ═══════════════════════════════════════════════════════════════
# API ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/api/search", methods=["POST"])
def search():
    if not check_rate_limit():
        return rate_limit_response()
    data = request.json or {}
    query = data.get("query", "").strip()
    scope = data.get("scope", "all_sources")
    firm = data.get("firm", None)
    n_results = data.get("n_results", 8)

    if not query:
        return jsonify({"error": "Query is required"}), 400
    try:
        hits = do_search(query, scope, firm, n_results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"query": query, "scope": scope, "firm": firm,
                     "total_hits": len(hits), "results": hits})


def sse(data):
    return f"data: {json.dumps(data)}\n\n"


def stream_text(text, chunk_size=12):
    words = text.split(' ')
    buf = []
    for w in words:
        buf.append(w)
        if len(buf) >= chunk_size:
            yield sse({"type": "text", "text": ' '.join(buf) + ' '})
            buf = []
    if buf:
        yield sse({"type": "text", "text": ' '.join(buf)})


@app.route("/api/synthesize", methods=["POST"])
def synthesize():
    if not check_rate_limit():
        return rate_limit_response()

    data = request.json or {}
    query = data.get("query", "").strip()
    scope = data.get("scope", "all_sources")
    firm = data.get("firm", None)
    n_results = data.get("n_results", 8)

    if not query:
        return jsonify({"error": "Query is required"}), 400

    try:
        hits = do_search(query, scope, firm, n_results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if not hits:
        return jsonify({"query": query, "synthesis": "No relevant passages found.",
                         "results": [], "total_hits": 0})

    context = build_context(hits)

    def generate():
        yield sse({"type": "sources", "total_hits": len(hits), "results": hits})

        yield sse({"type": "stage", "stage": "synthesizing", "label": "Synthesizing answer from sources..."})
        t0 = time.time()
        try:
            draft = agent_synthesize(query, context, scope, firm)
        except Exception as e:
            yield sse({"type": "error", "error": f"Synthesis failed: {e}"})
            yield sse({"type": "done"})
            return
        synth_time = round(time.time() - t0, 1)
        yield sse({"type": "stage", "stage": "synthesized", "label": f"Draft ready ({synth_time}s)", "draft_preview": draft[:200]})

        yield sse({"type": "stage", "stage": "verifying", "label": "Verifying citations & accuracy..."})
        t0 = time.time()
        try:
            verification = agent_verify(query, context, draft)
        except Exception as e:
            yield sse({"type": "stage", "stage": "verify_skipped", "label": "Verification unavailable, returning draft"})
            for chunk in stream_text(draft):
                yield chunk
            yield sse({"type": "done"})
            return

        verify_time = round(time.time() - t0, 1)
        score = verification.get("overall_score", "?")
        needs_refine = verification.get("needs_refinement", False)

        yield sse({
            "type": "stage", "stage": "verified",
            "label": f"Quality score: {score}/10 ({verify_time}s)",
            "verification": {
                "score": score, "needs_refinement": needs_refine,
                "citation_score": verification.get("citation_accuracy", {}).get("score", "?"),
                "hallucination_score": verification.get("hallucination_check", {}).get("score", "?"),
                "completeness_score": verification.get("completeness", {}).get("score", "?"),
            }
        })

        if needs_refine:
            yield sse({"type": "stage", "stage": "refining", "label": "Refining answer based on verification..."})
            t0 = time.time()
            try:
                final = agent_refine(query, context, draft, verification)
            except:
                final = draft
            refine_time = round(time.time() - t0, 1)
            yield sse({"type": "stage", "stage": "refined", "label": f"Answer refined ({refine_time}s)"})
        else:
            yield sse({"type": "stage", "stage": "passed", "label": "Passed verification — no refinement needed"})
            final = draft

        yield sse({"type": "stage", "stage": "streaming", "label": "Delivering final answer"})
        for chunk in stream_text(final):
            yield chunk

        yield sse({"type": "done", "verified": True, "score": score, "refined": needs_refine})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ═══════════════════════════════════════════════════════════════
# DEBATE ENGINE
# ═══════════════════════════════════════════════════════════════

PERSONA_MODELS = {
    "sec":     ("claude", MODEL_SYNTH),
    "buyer":   ("gpt",    "gpt-4o"),
    "auditor": ("claude", MODEL_SYNTH),
    "expert":  ("gpt",    "gpt-4o"),
}

PERSONA_SYSTEMS = {
    "sec": """You are an SEC Staff reviewer specializing in carve-out financial statement filings. You focus on:
- Investor protection and disclosure adequacy
- Compliance with Reg S-X, SAB Topic 1.B, and SEC comment letter precedent
- Whether allocations and methodologies are clearly and fully disclosed
- Red flags that would trigger a comment letter

Your tone is formal, precise, and regulatory. You cite specific SEC rules and precedent.
Ground your positions in the provided source passages where possible, citing [Source: Firm - Title, p.X].""",

    "buyer": """You are a buy-side deal team member evaluating a carve-out target. You focus on:
- Standalone economics and true cost structure
- Quality of earnings impact from allocation choices
- Hidden costs, stranded costs, and TSA dependencies
- Purchase price implications and EBITDA adjustability

Your tone is direct, commercially focused, and skeptical of management assumptions.
Ground your positions in the provided source passages where possible, citing [Source: Firm - Title, p.X].""",

    "auditor": """You are the external auditor for a carve-out engagement. You focus on:
- GAAP compliance and auditability of allocations
- Documentation requirements and audit evidence
- Whether methodologies are reasonable, supportable, and consistently applied
- Risk areas that require additional procedures or sensitivity analysis

Your tone is measured, thorough, and grounded in standards. You cite ASC topics, PCAOB standards, and Big 4 methodology.
Ground your positions in the provided source passages where possible, citing [Source: Firm - Title, p.X].""",

    "expert": """You are a veteran carve-out practitioner who has executed 20+ carve-out transactions. You focus on:
- What actually works in practice vs. what looks good on paper
- Common pitfalls and how to avoid them
- Practical trade-offs between ideal methodology and execution reality
- Stakeholder management — balancing SEC, auditor, buyer, and seller needs

Your tone is experienced, pragmatic, and plain-spoken. You share real-world examples and battle-tested advice.
Ground your positions in the provided source passages where possible, citing [Source: Firm - Title, p.X].""",
}

DEBATE_PHASES = {
    "opening":    "Present your opening position on the topic. Be clear, specific, and cite sources.",
    "challenge":  "Challenge the other participants' positions. Identify weaknesses, gaps, or risks in their arguments.",
    "convergence":"Identify areas of agreement across the panel. Acknowledge valid points from others. Clarify where genuine disagreements remain.",
    "synthesis":  "Provide your final recommendation considering the full debate. State what the deal team should actually do, with practical next steps.",
}


def call_persona(persona_id, system, user_msg):
    provider, model = PERSONA_MODELS.get(persona_id, ("claude", MODEL_SYNTH))
    if provider == "claude":
        resp = claude.messages.create(
            model=model, max_tokens=1200, system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        return resp.content[0].text
    else:
        resp = gpt.chat.completions.create(
            model=model, max_tokens=1200,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
        )
        return resp.choices[0].message.content


@app.route("/api/debate/1v1", methods=["POST"])
def debate_1v1():
    if not check_rate_limit():
        return rate_limit_response()

    data = request.json or {}
    topic = data.get("topic", "").strip()
    user_message = data.get("message", "").strip()
    history = data.get("history", [])

    if not user_message and not topic:
        return jsonify({"error": "Message or topic is required"}), 400

    search_query = user_message or topic
    hits = do_search(search_query, "all_sources", None, 6)
    context = build_context(hits) if hits else "No specific source passages retrieved."

    system = PERSONA_SYSTEMS["auditor"] + f"""

You are in a 1v1 cross-examination with a deal team member. They are challenging your positions. Respond directly to their points.

Relevant source passages for this discussion:
{context}"""

    messages = []
    for h in history[-8:]:
        if h["role"] == "user":
            messages.append({"role": "user", "content": h["text"]})
        else:
            messages.append({"role": "assistant", "content": h["text"]})

    if user_message:
        messages.append({"role": "user", "content": user_message})
    elif topic:
        messages.append({"role": "user", "content": f"The topic for examination is: {topic}\n\nPlease present your opening position."})

    def generate():
        yield sse({"type": "sources", "results": hits[:4]})
        try:
            provider, model = PERSONA_MODELS["auditor"]
            if provider == "claude":
                with claude.messages.stream(
                    model=model, max_tokens=1200, system=system, messages=messages,
                ) as stream:
                    for text in stream.text_stream:
                        yield sse({"type": "text", "text": text})
            else:
                resp = gpt.chat.completions.create(
                    model=model, max_tokens=1200, stream=True,
                    messages=[{"role": "system", "content": system}] + messages,
                )
                for chunk in resp:
                    if chunk.choices[0].delta.content:
                        yield sse({"type": "text", "text": chunk.choices[0].delta.content})
        except Exception as e:
            yield sse({"type": "error", "error": str(e)})
        yield sse({"type": "done"})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/api/debate/multi", methods=["POST"])
def debate_multi():
    if not check_rate_limit():
        return rate_limit_response()

    data = request.json or {}
    topic = data.get("topic", "").strip()
    personas_list = data.get("personas", [])
    phase = data.get("phase", "opening")
    previous_positions = data.get("previous_positions", {})

    if not topic or not personas_list:
        return jsonify({"error": "Topic and personas are required"}), 400

    hits = do_search(topic, "all_sources", None, 8)
    context = build_context(hits) if hits else "No specific source passages retrieved."
    phase_instruction = DEBATE_PHASES.get(phase, DEBATE_PHASES["opening"])

    others_text = ""
    if previous_positions:
        parts = []
        for pid, text in previous_positions.items():
            pname = {"sec": "SEC Staff", "buyer": "Buyer", "auditor": "Auditor", "expert": "Carveout Expert"}.get(pid, pid)
            parts.append(f"--- {pname}'s position ---\n{text}")
        others_text = "\n\n".join(parts)

    def generate():
        yield sse({"type": "sources", "results": hits[:4]})
        for pid in personas_list:
            if pid not in PERSONA_SYSTEMS:
                continue
            system = PERSONA_SYSTEMS[pid]
            provider, model = PERSONA_MODELS.get(pid, ("claude", MODEL_SYNTH))
            user_msg = f"""Topic: {topic}

Relevant source passages:
{context}

Phase: {phase.upper()}
Instructions: {phase_instruction}"""
            if others_text and phase != "opening":
                user_msg += f"\n\nOther participants' positions:\n{others_text}"
            user_msg += "\n\nProvide your response for this phase."

            yield sse({"type": "persona_start", "persona": pid, "model": model})
            try:
                text = call_persona(pid, system, user_msg)
                yield sse({"type": "persona_done", "persona": pid, "text": text, "model": model})
            except Exception as e:
                yield sse({"type": "persona_error", "persona": pid, "error": str(e)})
        yield sse({"type": "done"})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ═══════════════════════════════════════════════════════════════
# UTILITY ROUTES
# ═══════════════════════════════════════════════════════════════

@app.route("/api/sources", methods=["GET"])
def sources():
    inv_path = os.path.join(DB_DIR, "source_inventory.json")
    if os.path.exists(inv_path):
        with open(inv_path) as f:
            inventory = json.load(f)
    else:
        inventory = {}

    by_category = {}
    for fname, info in inventory.items():
        cat = info.get("category", "other")
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append({
            "file": fname, "firm": info["firm"],
            "title": info["title"], "year": info["year"],
            "chunks": info["chunks"],
        })
    big4_firms = sorted(set(s["firm"] for s in by_category.get("big4", [])))
    return jsonify({"total_chunks": collection.count(), "big4_firms": big4_firms,
                     "by_category": by_category})


@app.route("/", methods=["GET"])
def serve_app():
    html_path = os.path.join(SCRIPT_DIR, "index.html")
    try:
        with open(html_path) as f:
            html = f.read()
        return Response(html, mimetype="text/html")
    except:
        return "CarveoutAI — index.html not found. Check deployment.", 404


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "chunks": collection.count(),
        "rate_limit": f"{RATE_LIMIT}/hour",
        "models": {
            "synth": MODEL_SYNTH, "verify": MODEL_VERIFY, "refine": MODEL_REFINE,
            "debate": {k: v[1] for k, v in PERSONA_MODELS.items()},
        }
    })


if __name__ == "__main__":
    print(f"CarveoutAI starting on port {PORT}")
    print(f"ChromaDB: {collection.count()} chunks loaded")
    print(f"Rate limit: {RATE_LIMIT} requests/hour per IP")
    print(f"Research — Synth: {MODEL_SYNTH} | Verify: {MODEL_VERIFY} | Refine: {MODEL_REFINE}")
    print(f"Debate   — SEC/Auditor: Claude | Buyer/Expert: GPT-4o")
    app.run(host="0.0.0.0", port=PORT, debug=False)
