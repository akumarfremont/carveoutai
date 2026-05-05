# Deploy CarveoutAI to a public URL

This is the non-technical path. No terminal, no Node install. About **10 minutes**, mostly waiting.

You will need:
- The GitHub account that owns `akumarfremont/carveoutai`
- A credit card on file with Anthropic and OpenAI (the app pays them per query — usually pennies per question)
- That's it.

---

## Step 1 — Get an Anthropic API key

1. Go to **https://console.anthropic.com**
2. Sign up or sign in.
3. In the left sidebar, click **API Keys**.
4. Click **Create Key**, give it a name like "CarveoutAI", click Create.
5. **Copy the key** — it starts with `sk-ant-…`. Paste it somewhere safe; you can't see it again after closing the dialog.
6. While you're there: in **Plans & Billing** add at least $5 of credit (most questions cost a fraction of a cent).

---

## Step 2 — Get an OpenAI API key

1. Go to **https://platform.openai.com/api-keys**
2. Sign up or sign in.
3. Click **Create new secret key**, give it a name like "CarveoutAI", click Create.
4. **Copy the key** — it starts with `sk-…`. Paste it somewhere safe.
5. In **Settings → Billing** add at least $5 of credit.

You should now have two strings starting with `sk-…` saved somewhere.

---

## Step 3 — Deploy on Vercel

Vercel is the company that ships Next.js. They run a free tier that's perfect for this.

1. Go to **https://vercel.com/signup** and sign up **with your GitHub account** (the same one that owns the carveoutai repo). That makes the next step one click.
2. After signup, you'll land on the dashboard. Click **Add New… → Project**.
3. Find `akumarfremont/carveoutai` in the list and click **Import**.
4. On the configure screen, leave everything default *except* expand **Environment Variables** and add two:
   - Name: `ANTHROPIC_API_KEY` — Value: paste the key from Step 1
   - Name: `OPENAI_API_KEY` — Value: paste the key from Step 2
5. Under **Branch** (might be hidden under "Git" or "Production Branch"), set it to `claude/carveout-accounting-app-9C3kv` if it isn't already.
6. Click **Deploy**.

The first deploy takes about **3–4 minutes** because it embeds all 312 chunks of guide content into the search index. You'll see a build log streaming. When it finishes, you get a URL like `carveoutai-abc123.vercel.app`.

Click it. The app is live.

---

## Step 4 — Verify it works

On your live URL:

1. Click **Research**.
2. Ask: *"How should goodwill be allocated to a carve-out entity?"* — you should see Claude stream an answer with bracketed citations like `[1]`, `[2]`, and a **Sources** list at the bottom showing real EY / KPMG / PwC / Deloitte page references.
3. Click the **Verify with ChatGPT** button on the answer card. A panel slides in from the right with a four-section critique.
4. Go back, click **Debate**. Type a topic, pick two of the three voices, click Start debate. Five turns play out automatically.

If any of that fails, open the Vercel dashboard → your project → **Logs** and look at the latest red line. Usually it's a typo'd API key or no billing credit on one of the providers.

---

## Costs (approximate)

- **Vercel free tier**: $0. The free tier easily covers personal use.
- **Anthropic**: a typical research question costs $0.005–$0.02. A debate (5 turns) costs $0.05–$0.10.
- **OpenAI**: embedding all 312 chunks once is about $0.005. Each verify-with-ChatGPT click is $0.005–$0.02.

Set monthly hard limits in each provider's billing page if you want to cap spend.

---

## Re-deploys

Any time you update a guide PDF (e.g., a new EY edition), you (or I) push the new chunks to GitHub and Vercel auto-redeploys. The build script automatically re-embeds anything new and the live site updates within a few minutes.
