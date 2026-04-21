"""
CarveoutAI — Knowledge Base Ingestion Pipeline
Parses all PDFs and text files, chunks them with metadata,
and stores in ChromaDB with source categorization.
"""
import os, re, json, hashlib
import pdfplumber
import chromadb
from chromadb.utils import embedding_functions

# ── Config ──
GUIDE_DIR = "/sessions/peaceful-practical-mayer/mnt/All Demo Files/Carveout Guide"
DB_DIR = "/sessions/peaceful-practical-mayer/carveout_db"
CHUNK_SIZE = 600  # tokens approx (words * 1.3)
CHUNK_OVERLAP = 80

# ── Source metadata mapping ──
SOURCE_META = {
    # Big 4
    "on-the-radar-carve-out-2025": {"firm": "Deloitte", "category": "big4", "title": "On the Radar: Carve-out Financial Statements (2025)", "year": "2025"},
    "EY - Guide to Prepari": {"firm": "EY", "category": "big4", "title": "Guide to Preparing Carve-out Financial Statements", "year": "2024"},
    "PwC - Carve-out Finan": {"firm": "PwC", "category": "big4", "title": "Carve-out Financial Statements Guide (July 2024)", "year": "2024"},
    "KPMG - Combined and C": {"firm": "KPMG", "category": "big4", "title": "Combined and Carve-out Financial Statements (IFRS)", "year": "2024"},
    "Grant Thornton - Carv": {"firm": "Grant Thornton", "category": "big4", "title": "Carve-Out Financial Statements (April 2025)", "year": "2025"},
    # Advisory
    "Chess Consulting": {"firm": "Chess Consulting", "category": "advisory", "title": "Carve-Out Accounting Fact Sheet", "year": "2024"},
    "KPMG - Winning": {"firm": "KPMG", "category": "advisory", "title": "Winning the Carve-Out Relay (March 2026)", "year": "2026"},
    "KPMG - Carve-Out Strategy": {"firm": "KPMG", "category": "advisory", "title": "Carve-Out Strategy (March 2026)", "year": "2026"},
    "KPMG - Separation": {"firm": "KPMG", "category": "advisory", "title": "Separation in Practice (Feb 2026)", "year": "2026"},
    "Embark": {"firm": "Embark", "category": "advisory", "title": "The Lowdown on Carve-Out Financial Statements", "year": "2024"},
    "CrossCountry": {"firm": "CrossCountry Consulting", "category": "advisory", "title": "5 Common Misconceptions on Carve-Out FS", "year": "2025"},
    "EisnerAmper": {"firm": "EisnerAmper", "category": "advisory", "title": "Due Diligence for Carve-Out Transactions", "year": "2025"},
    # Law Firms
    "Latham Watkins": {"firm": "Latham & Watkins", "category": "law_firm", "title": "Financial Statement Requirements in US Securities Offerings", "year": "2024"},
    "Morgan Lewis - Carve-Out Transactions Practice": {"firm": "Morgan Lewis", "category": "law_firm", "title": "Carve-Out Transactions Practice Note (2023)", "year": "2023"},
    "Morgan Lewis - Carve-Out Transactions (2010)": {"firm": "Morgan Lewis", "category": "law_firm", "title": "Carve-Out Transactions (2010)", "year": "2010"},
    "Skadden": {"firm": "Skadden Arps", "category": "law_firm", "title": "2025 SEC Filing Deadlines and FS Staleness", "year": "2025"},
    "Morgan Lewis - SEC Revisions": {"firm": "Morgan Lewis", "category": "law_firm", "title": "SEC Revisions to Acquired Business FS Rules (2020)", "year": "2020"},
    # SEC/Regulatory
    "SEC - Financial Reporting Manual": {"firm": "SEC", "category": "sec_regulatory", "title": "Financial Reporting Manual (FRM)", "year": "2025"},
    "SEC - SAB 114": {"firm": "SEC", "category": "sec_regulatory", "title": "SAB 114 (SAB Topic 1.B Updates)", "year": "2011"},
    "SEC - SAB 112": {"firm": "SEC", "category": "sec_regulatory", "title": "SAB 112", "year": "1993"},
    "SEC - Rule 3-05": {"firm": "SEC", "category": "sec_regulatory", "title": "Rule 3-05 Amendments (Release 33-10786)", "year": "2020"},
    "SEC - SAB Topic 1": {"firm": "SEC", "category": "sec_regulatory", "title": "SAB Topic 1 Financial Statements (Full Codification)", "year": "2025"},
    # EY Technical Line
    "EY - Technical Line": {"firm": "EY", "category": "big4", "title": "Technical Line: Applying SEC Rule 3-05 Requirements (March 2025)", "year": "2025"},
}


def match_source_meta(filename):
    """Match a filename to its metadata entry."""
    for key, meta in SOURCE_META.items():
        if key.lower() in filename.lower():
            return meta
    # Default fallback
    return {"firm": "Unknown", "category": "other", "title": filename, "year": "2024"}


def extract_text_from_pdf(filepath):
    """Extract text from a PDF file using pdfplumber."""
    pages = []
    try:
        with pdfplumber.open(filepath) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({"page": i + 1, "text": text.strip()})
    except Exception as e:
        print(f"  ⚠ Error parsing {os.path.basename(filepath)}: {e}")
    return pages


def extract_text_from_txt(filepath):
    """Read a text file."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read().strip()
    return [{"page": 1, "text": text}] if text else []


def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split text into overlapping chunks by word count."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
    return chunks


def process_file(filepath):
    """Process a single file into chunks with metadata."""
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower()

    print(f"  📄 Processing: {filename}")

    if ext == ".pdf":
        pages = extract_text_from_pdf(filepath)
    elif ext in (".txt", ".htm", ".html"):
        pages = extract_text_from_txt(filepath)
    else:
        print(f"  ⏭ Skipping unsupported file: {filename}")
        return []

    if not pages:
        print(f"  ⚠ No text extracted from {filename}")
        return []

    meta = match_source_meta(filename)
    all_chunks = []

    for page_data in pages:
        chunks = chunk_text(page_data["text"])
        for i, chunk_text_content in enumerate(chunks):
            chunk_id = hashlib.md5(f"{filename}:{page_data['page']}:{i}".encode()).hexdigest()
            all_chunks.append({
                "id": chunk_id,
                "text": chunk_text_content,
                "metadata": {
                    "source_file": filename,
                    "firm": meta["firm"],
                    "category": meta["category"],
                    "title": meta["title"],
                    "year": meta["year"],
                    "page": page_data["page"],
                    "chunk_index": i,
                }
            })

    print(f"    → {len(pages)} pages, {len(all_chunks)} chunks")
    return all_chunks


def main():
    print("=" * 60)
    print("CarveoutAI — Knowledge Base Ingestion")
    print("=" * 60)

    # Collect all files
    files = []
    for f in sorted(os.listdir(GUIDE_DIR)):
        ext = os.path.splitext(f)[1].lower()
        if ext in (".pdf", ".txt", ".htm", ".html"):
            files.append(os.path.join(GUIDE_DIR, f))

    print(f"\n📁 Found {len(files)} source files in Carveout Guide folder\n")

    # Process all files
    all_chunks = []
    for filepath in files:
        chunks = process_file(filepath)
        all_chunks.extend(chunks)

    print(f"\n{'=' * 60}")
    print(f"Total chunks: {len(all_chunks)}")

    # Category breakdown
    categories = {}
    firms = {}
    for c in all_chunks:
        cat = c["metadata"]["category"]
        firm = c["metadata"]["firm"]
        categories[cat] = categories.get(cat, 0) + 1
        firms[firm] = firms.get(firm, 0) + 1

    print(f"\nBy category:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count} chunks")

    print(f"\nBy firm:")
    for firm, count in sorted(firms.items()):
        print(f"  {firm}: {count} chunks")

    # Store in ChromaDB
    print(f"\n{'=' * 60}")
    print("Storing in ChromaDB...")

    # Use default embedding function (all-MiniLM-L6-v2)
    ef = embedding_functions.DefaultEmbeddingFunction()

    client = chromadb.PersistentClient(path=DB_DIR)

    # Delete existing collection if it exists
    try:
        client.delete_collection("carveout_kb")
    except:
        pass

    collection = client.create_collection(
        name="carveout_kb",
        embedding_function=ef,
        metadata={"description": "CarveoutAI Knowledge Base"}
    )

    # Batch insert (ChromaDB max batch = 5461)
    BATCH = 500
    for i in range(0, len(all_chunks), BATCH):
        batch = all_chunks[i:i + BATCH]
        collection.add(
            ids=[c["id"] for c in batch],
            documents=[c["text"] for c in batch],
            metadatas=[c["metadata"] for c in batch],
        )
        print(f"  Inserted batch {i // BATCH + 1}: {len(batch)} chunks")

    print(f"\n✅ Knowledge base created: {collection.count()} total chunks in ChromaDB")
    print(f"   DB location: {DB_DIR}")

    # Save source inventory
    inventory = {}
    for c in all_chunks:
        key = c["metadata"]["source_file"]
        if key not in inventory:
            inventory[key] = {
                "firm": c["metadata"]["firm"],
                "category": c["metadata"]["category"],
                "title": c["metadata"]["title"],
                "year": c["metadata"]["year"],
                "chunks": 0,
            }
        inventory[key]["chunks"] += 1

    inv_path = os.path.join(DB_DIR, "source_inventory.json")
    with open(inv_path, "w") as f:
        json.dump(inventory, f, indent=2)
    print(f"   Source inventory: {inv_path}")


if __name__ == "__main__":
    main()
