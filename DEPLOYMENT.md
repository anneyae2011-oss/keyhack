# 🚀 NanaTwo Deployment Guide

Complete step-by-step guide to deploy NanaTwo AI Gateway to Vercel with PostgreSQL.

---

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Neon account (free PostgreSQL) or any PostgreSQL provider

---

## Step 1: Set Up PostgreSQL Database

### Option A: Neon (Recommended for Vercel)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (looks like `postgresql://user:pass@host/dbname?sslmode=require`)
4. Save it for later

### Option B: Other PostgreSQL Providers

- **Supabase:** [supabase.com](https://supabase.com) → Create project → Get connection string
- **Railway:** [railway.app](https://railway.app) → New PostgreSQL → Get connection string
- **Heroku Postgres:** [heroku.com](https://heroku.com) → Add Heroku Postgres addon

---

## Step 2: Deploy to Vercel

### Quick Deploy (One-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anneyae2011-oss/keyhack)

1. Click the button above
2. Sign in to Vercel
3. Import the `keyhack` repository
4. Add environment variables (see below)
5. Click **Deploy**

### Manual Deploy

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import Git Repository → Select `anneyae2011-oss/keyhack`
3. Configure Project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default)

4. Add Environment Variables:

```bash
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
GATEWAY_SECRET=your-super-secret-32-char-string-here-change-this
```

**Important:** 
- `DATABASE_URL` — Your PostgreSQL connection string from Step 1
- `GATEWAY_SECRET` — Generate a strong 32+ character secret (used to sign API keys)
  - Example: `openssl rand -base64 32` or use a password generator

5. Click **Deploy**

---

## Step 3: Initialize Database

After deployment completes, you need to create the database tables.

### Get Your Deployment URL

Vercel will show your deployment URL (e.g., `https://keyhack-abc123.vercel.app`)

### Call the Init Endpoint

```bash
curl -X POST https://keyhack-abc123.vercel.app/api/admin/init \
  -H "X-Admin-Secret: your-super-secret-32-char-string-here-change-this"
```

**Response:**

```json
{
  "success": true,
  "initialKey": "ntw_abc123xyz...",
  "message": "Save this key — it won't be shown again."
}
```

**⚠️ IMPORTANT:** Copy and save the `initialKey` — this is your first gateway API key!

---

## Step 4: Access the Dashboard

1. Go to your deployment URL: `https://keyhack-abc123.vercel.app`
2. Enter your `GATEWAY_SECRET` when prompted
3. You're in! 🎉

---

## Step 5: Add Provider Keys

### Add OpenAI Key

1. Go to **Provider Keys** panel
2. Select **openai** from dropdown
3. Set **Priority** to `1` (primary)
4. Enter **Key Name:** "OpenAI Primary"
5. Enter **API Key:** Your OpenAI key (starts with `sk-`)
6. Click **Add Key**

### Add Fallback Keys (Optional but Recommended)

Repeat the above with:
- **Priority:** `2` (fallback 1)
- **Key Name:** "OpenAI Fallback 1"
- **API Key:** Another OpenAI key

Add as many fallback keys as you want. When the primary key fails, NanaTwo automatically uses the next priority.

### Add Other Providers

Repeat for Anthropic, Google, Mistral, etc.

---

## Step 6: Test the Gateway

### Using cURL

```bash
curl -X POST https://keyhack-abc123.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer ntw_YOUR_INITIAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello from NanaTwo!"}]
  }'
```

### Using Python

```python
import openai

client = openai.OpenAI(
    api_key="ntw_YOUR_INITIAL_KEY",
    base_url="https://keyhack-abc123.vercel.app/api/v1"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello from NanaTwo!"}]
)
print(response.choices[0].message.content)
```

### Check the Dashboard

Go to **Dashboard** or **Request Logs** to see your request logged in real-time!

---

## Step 7: Generate More Gateway Keys

1. Go to **Gateway Keys** panel
2. Enter a name (e.g., "Production App", "Mobile App", "Test Key")
3. Click **Generate**
4. Copy the key — it's shown only once!
5. Use this key in your applications

---

## 🔄 Testing Fallback

To test the automatic fallback:

1. Add 2+ provider keys with different priorities
2. Make a request using a model from that provider
3. Temporarily disable or invalidate the primary key
4. Make another request — NanaTwo will automatically use the fallback key
5. Check **Request Logs** — you'll see `Fallback: ↺ 2x` (or however many attempts)

---

## 🔒 Security Best Practices

### Environment Variables

- Never commit `.env` files to Git
- Use Vercel's environment variable UI for production secrets
- Rotate `GATEWAY_SECRET` periodically

### Gateway Keys

- Generate separate keys for each application/environment
- Revoke keys immediately if compromised
- Monitor usage in the dashboard

### Provider Keys

- Use separate API keys for NanaTwo (don't share with other apps)
- Set up billing alerts on provider dashboards
- Monitor error counts in **Provider Keys** panel

---

## 🐛 Troubleshooting

### "Missing API key" Error

- Check that you're passing the gateway key via `Authorization: Bearer <key>` or `X-Api-Key: <key>` header
- Verify the key hasn't been revoked in the dashboard

### "No active API keys configured for provider"

- Go to **Provider Keys** panel
- Add at least one key for the provider you're trying to use
- Make sure the key is marked as **Active**

### Database Connection Errors

- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check that your database allows connections from Vercel's IP ranges
- For Neon: Make sure `?sslmode=require` is in the connection string

### Init Endpoint Returns 401

- Check that `X-Admin-Secret` header matches your `GATEWAY_SECRET` environment variable
- Make sure there are no extra spaces or newlines

---

## 📊 Monitoring

### Dashboard Metrics

- **Total Requests** — All requests through the gateway
- **Fallback Triggered** — How many times fallback was used
- **Success Rate** — Percentage of successful requests
- **Provider Traffic** — Breakdown by provider

### Request Logs

- Auto-refreshes every 10 seconds
- Shows full request history with:
  - Timestamp
  - Provider & model
  - HTTP status
  - Token usage
  - Latency
  - Fallback details
  - Error messages

---

## 🔄 Updating

To update NanaTwo after pulling new changes:

```bash
git pull origin main
git push origin main
```

Vercel will automatically redeploy on push.

---

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/anneyae2011-oss/keyhack/issues)
- **Discussions:** [GitHub Discussions](https://github.com/anneyae2011-oss/keyhack/discussions)

---

## ✅ Deployment Checklist

- [ ] PostgreSQL database created
- [ ] Vercel project deployed
- [ ] Environment variables set (`DATABASE_URL`, `GATEWAY_SECRET`)
- [ ] Database initialized via `/api/admin/init`
- [ ] Initial gateway key saved
- [ ] Dashboard accessible
- [ ] Provider keys added (at least 1)
- [ ] Test request successful
- [ ] Fallback tested (optional)
- [ ] Additional gateway keys generated

---

**🎉 Congratulations! NanaTwo is now live and ready to handle your AI requests with automatic fallback!**

[← Back to README](README.md)
