# 🌸 NanaTwo AI Gateway

<div align="center">

![NanaTwo](https://img.shields.io/badge/NanaTwo-AI%20Gateway-FF2D78?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDhWMTZMMTIgMjJMMjAgMTZWOEwxMiAyWiIgc3Ryb2tlPSIjRkYyRDc4IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**Premium AI Gateway with Automatic Key Fallback · Cyberpunk Pink Theme**

[Features](#-features) • [Quick Start](#-quick-start) • [Deploy](#-deploy-to-vercel) • [API Docs](#-api-usage) • [Dashboard](#-dashboard)

</div>

---

## ✨ Features

### 🔄 **Automatic API Key Fallback**
When an API key fails (rate limit, quota exceeded, invalid key, etc.), NanaTwo **automatically retries** with the next available key in priority order. No manual intervention needed.

**Triggers fallback on:**
- `401` Unauthorized
- `403` Forbidden  
- `429` Rate Limit Exceeded
- `500`, `502`, `503`, `504` Server Errors
- Error patterns: `invalid api key`, `quota exceeded`, `rate limit`, etc.

### 🎯 **Multi-Provider Support**
- **OpenAI** (GPT-4o, GPT-4o-mini, o1, o3-mini)
- **Anthropic** (Claude 3.5 Sonnet, Opus, Haiku)
- **Google** (Gemini 1.5 Pro, Flash, 2.0 Flash)
- **Mistral** (Mistral Large, Mixtral)
- **Cohere** (Command models)

### 🔐 **Gateway API Keys**
Generate your own API keys (`ntw_...`) to control access to NanaTwo. Each key tracks:
- Total requests
- Token usage
- Last used timestamp

### 📊 **Real-time Dashboard**
Premium cyberpunk pink UI with:
- Live request logs (auto-refresh every 10s)
- Success rate metrics
- Provider traffic breakdown
- Fallback usage statistics
- Key management interface

### 🗄️ **PostgreSQL Backend**
Uses Neon PostgreSQL (or any Postgres) for:
- Gateway key storage
- Provider key management (encrypted)
- Request logging with full fallback history

### 🚀 **Vercel-Ready**
One-click deploy to Vercel with automatic HTTPS, edge functions, and global CDN.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/anneyae2011-oss/keyhack.git
cd keyhack
npm install
```

### 2. Set Up Database

Create a PostgreSQL database (recommended: [Neon](https://neon.tech) for Vercel):

```bash
# Copy env template
cp .env.example .env

# Edit .env and add:
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
GATEWAY_SECRET=your-super-secret-32-char-string-here
```

### 3. Initialize Database

```bash
# Option A: Use the init API (after deploying)
curl -X POST https://your-app.vercel.app/api/admin/init \
  -H "X-Admin-Secret: your-super-secret-32-char-string-here"

# Option B: Use Drizzle Kit locally
npm run db:push
```

The init endpoint creates all tables and returns your first gateway key. **Save it!**

### 4. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anneyae2011-oss/keyhack)

### Manual Deploy

1. Push to GitHub (already done ✅)
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select `keyhack` repo
4. Add environment variables:
   - `DATABASE_URL` — Your PostgreSQL connection string
   - `GATEWAY_SECRET` — 32+ character secret for signing keys
5. Deploy!
6. After deploy, call `/api/admin/init` to create tables:

```bash
curl -X POST https://your-app.vercel.app/api/admin/init \
  -H "X-Admin-Secret: YOUR_GATEWAY_SECRET"
```

---

## 🎨 Dashboard

Access the dashboard at your deployed URL. You'll be prompted for the `GATEWAY_SECRET`.

### Panels

1. **Dashboard** — Real-time stats, success rate, provider breakdown, recent logs
2. **Gateway Keys** — Generate and manage NanaTwo API keys
3. **Provider Keys** — Add OpenAI, Anthropic, Google, etc. keys with priority levels
4. **Request Logs** — Live feed of all requests with fallback details
5. **API Docs** — Code examples and integration guide

---

## 🔌 API Usage

### Endpoint

```
POST https://your-app.vercel.app/api/v1/chat/completions
```

### Authentication

Pass your NanaTwo gateway key via header:

```bash
Authorization: Bearer ntw_YOUR_GATEWAY_KEY
# or
X-Api-Key: ntw_YOUR_GATEWAY_KEY
```

### Request Body (OpenAI-compatible)

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

### Response Headers

NanaTwo adds custom headers to every response:

- `X-NanaTwo-Provider` — Which provider handled the request
- `X-NanaTwo-Fallback-Used` — `true` if a fallback key was used
- `X-NanaTwo-Attempts` — Number of key attempts made
- `X-NanaTwo-Latency-Ms` — Total gateway latency

### Examples

#### cURL

```bash
curl -X POST https://your-app.vercel.app/api/v1/chat/completions \
  -H "Authorization: Bearer ntw_YOUR_GATEWAY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### Python (OpenAI SDK)

```python
import openai

client = openai.OpenAI(
    api_key="ntw_YOUR_GATEWAY_KEY",
    base_url="https://your-app.vercel.app/api/v1"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

#### JavaScript / TypeScript

```typescript
const response = await fetch("https://your-app.vercel.app/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ntw_YOUR_GATEWAY_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "claude-3-5-sonnet-20241022",
    messages: [{ role: "user", content: "Hello!" }]
  })
});
const data = await response.json();
```

---

## 🔑 Key Management

### Gateway Keys

1. Go to **Gateway Keys** panel
2. Enter a name (e.g. "Production App")
3. Click **Generate**
4. Copy the key — it's shown only once!

### Provider Keys

1. Go to **Provider Keys** panel
2. Select provider (OpenAI, Anthropic, etc.)
3. Set priority:
   - `1` = Primary key (used first)
   - `2+` = Fallback keys (used if primary fails)
4. Enter key name and API key
5. Click **Add Key**

**Example Setup:**

| Provider | Name | Priority | Status |
|----------|------|----------|--------|
| OpenAI | Primary | 1 | ✓ Active |
| OpenAI | Fallback 1 | 2 | ✓ Active |
| OpenAI | Fallback 2 | 3 | ✓ Active |

When the primary key hits rate limit, NanaTwo automatically uses Fallback 1, then Fallback 2.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Neon recommended)
- **ORM:** Drizzle ORM
- **Styling:** Tailwind CSS (Cyberpunk Pink theme)
- **Deployment:** Vercel
- **Language:** TypeScript

---

## 📁 Project Structure

```
keyhack/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/chat/completions/    # Main gateway endpoint
│   │   │   └── admin/                  # Admin APIs (keys, logs, init)
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard entry
│   │   └── globals.css                 # Cyberpunk theme
│   ├── components/                     # Dashboard UI components
│   └── lib/
│       ├── db/                         # Database schema & client
│       ├── gateway/
│       │   ├── fallback.ts             # 🔥 Key fallback engine
│       │   ├── providers.ts            # Provider request builders
│       │   └── crypto.ts               # Key encryption/hashing
│       └── auth.ts                     # Gateway key validation
├── drizzle.config.ts
├── package.json
└── vercel.json
```

---

## 🔒 Security

- **Encrypted Storage:** Provider API keys are encrypted with AES-256-GCM
- **Hashed Gateway Keys:** Gateway keys are hashed with HMAC-SHA256
- **Admin Auth:** All admin endpoints require `X-Admin-Secret` header
- **No Key Exposure:** Keys are never returned in API responses (except on creation)

---

## 📊 Monitoring

### Request Logs

Every request is logged with:
- Gateway key used
- Provider & model
- HTTP status
- Token usage (prompt + completion)
- Latency
- Error message (if any)
- Fallback details (used, attempts)

Access logs via:
- Dashboard → **Request Logs** panel
- API: `GET /api/admin/logs?limit=500` (requires admin secret)

---

## 🎯 Roadmap

- [ ] Rate limiting per gateway key
- [ ] Cost tracking & budgets
- [ ] Webhook notifications on fallback
- [ ] Model routing rules (e.g. route gpt-4 → claude-3-opus)
- [ ] Streaming support
- [ ] Multi-region failover
- [ ] Prometheus metrics export

---

## 🤝 Contributing

PRs welcome! Please open an issue first to discuss major changes.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🌸 About NanaTwo

NanaTwo is a production-ready AI gateway built for developers who need:
- **Reliability** — Never lose a request to rate limits
- **Simplicity** — OpenAI-compatible API, works with existing SDKs
- **Visibility** — Full request logging and real-time dashboard
- **Control** — Manage keys, priorities, and fallback behavior

Built with ❤️ by the keyhack team.

---

<div align="center">

**[⬆ Back to Top](#-nanatwo-ai-gateway)**

Made with 🌸 and cyberpunk vibes

</div>
