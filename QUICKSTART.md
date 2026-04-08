# ⚡ NanaTwo Quick Start (5 Minutes)

Get NanaTwo running locally in 5 minutes.

---

## 1. Clone & Install (1 min)

```bash
git clone https://github.com/anneyae2011-oss/keyhack.git
cd keyhack
npm install
```

---

## 2. Set Up Database (2 min)

### Option A: Neon (Easiest)

1. Go to [neon.tech](https://neon.tech) → Sign up (free)
2. Create new project → Copy connection string
3. Create `.env` file:

```bash
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
GATEWAY_SECRET=my-super-secret-key-change-this-in-production
```

### Option B: Local PostgreSQL

```bash
# Install PostgreSQL locally, then:
DATABASE_URL=postgresql://localhost:5432/nanatwo
GATEWAY_SECRET=my-super-secret-key-change-this-in-production
```

---

## 3. Start Dev Server (1 min)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 4. Initialize Database (30 sec)

In a new terminal:

```bash
curl -X POST http://localhost:3000/api/admin/init \
  -H "X-Admin-Secret: my-super-secret-key-change-this-in-production"
```

**Save the returned gateway key!**

---

## 5. Add Provider Key (30 sec)

1. Go to [http://localhost:3000](http://localhost:3000)
2. Enter your `GATEWAY_SECRET` (from `.env`)
3. Click **Provider Keys** → Add your OpenAI/Anthropic/Google key
4. Set **Priority** to `1`

---

## 6. Test It! (30 sec)

```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer ntw_YOUR_KEY_FROM_STEP_4" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## ✅ Done!

You now have:
- ✅ NanaTwo running locally
- ✅ Database initialized
- ✅ Gateway key generated
- ✅ Provider key added
- ✅ First request successful

---

## Next Steps

- **Add Fallback Keys:** Go to Provider Keys → Add more keys with priority 2, 3, etc.
- **Test Fallback:** Disable primary key → Make request → See automatic fallback in logs
- **Deploy to Vercel:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Read Full Docs:** See [README.md](README.md)

---

## 🐛 Troubleshooting

**"Cannot connect to database"**
- Check `DATABASE_URL` in `.env`
- Make sure PostgreSQL is running (if local)

**"Missing API key"**
- Make sure you're using the key from Step 4
- Check the `Authorization: Bearer <key>` header

**"No active API keys configured"**
- Go to Provider Keys panel
- Add at least one provider key (OpenAI, Anthropic, etc.)

---

**Need help?** Open an issue: [GitHub Issues](https://github.com/anneyae2011-oss/keyhack/issues)

[← Back to README](README.md)
