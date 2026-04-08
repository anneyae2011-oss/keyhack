/**
 * NanaTwo Fallback Engine — Standalone Test
 * Run: node test-fallback.mjs
 *
 * Tests the exact same logic as src/lib/gateway/fallback.ts
 * but with mocked DB and fetch so you don't need a live deployment.
 */

// ─── Colours ────────────────────────────────────────────────────────────────
const G = (s) => `\x1b[32m${s}\x1b[0m`;  // green
const R = (s) => `\x1b[31m${s}\x1b[0m`;  // red
const Y = (s) => `\x1b[33m${s}\x1b[0m`;  // yellow
const C = (s) => `\x1b[36m${s}\x1b[0m`;  // cyan
const B = (s) => `\x1b[1m${s}\x1b[0m`;   // bold

// ─── Inline fallback engine (mirrors src/lib/gateway/fallback.ts exactly) ───
const FALLBACK_STATUS_CODES = new Set([401, 403, 429, 500, 502, 503, 504]);
const FALLBACK_ERROR_PATTERNS = [
  /invalid.api.key/i,
  /api.key.not.found/i,
  /quota.exceeded/i,
  /rate.limit/i,
  /insufficient.quota/i,
  /billing/i,
  /unauthorized/i,
  /forbidden/i,
];

function shouldFallback(status, errorText) {
  if (FALLBACK_STATUS_CODES.has(status)) return true;
  return FALLBACK_ERROR_PATTERNS.some((p) => p.test(errorText));
}

async function fetchWithFallback(keys, buildRequest, mockFetch, onError, onSuccess) {
  if (keys.length === 0) throw new Error("No active API keys configured");

  let lastResponse = null;
  let lastError = "";
  let attempts = 0;

  for (const key of keys) {
    attempts++;
    const { url, init } = buildRequest(key.apiKey, key);

    let res;
    try {
      res = await mockFetch(url, init, key);
    } catch (networkErr) {
      await onError(key.id);
      lastError = String(networkErr);
      continue;
    }

    if (res.ok) {
      await onSuccess(key.id);
      return { response: res, usedKeyId: key.id, fallbackUsed: attempts > 1, attempts };
    }

    const bodyText = res._body ?? "";
    if (shouldFallback(res.status, bodyText)) {
      await onError(key.id);
      lastResponse = res;
      lastError = bodyText;
      continue;
    }

    // Non-fallback error (e.g. 400) — return immediately, key is fine
    await onSuccess(key.id);
    return { response: res, usedKeyId: key.id, fallbackUsed: attempts > 1, attempts };
  }

  if (lastResponse) return { response: lastResponse, usedKeyId: "", fallbackUsed: true, attempts };
  return {
    response: { ok: false, status: 503, _body: `All keys exhausted. Last: ${lastError}` },
    usedKeyId: "", fallbackUsed: true, attempts,
  };
}

// ─── Test helpers ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(G("  ✓ ") + label);
    passed++;
  } else {
    console.log(R("  ✗ ") + label);
    failed++;
  }
}

function makeKey(id, apiKey, priority) {
  return { id, apiKey, priority, provider: "openai", errorCount: 0, successCount: 0 };
}

// Mock fetch: returns different responses based on which key is used
function mockFetchFactory(keyBehaviours) {
  // keyBehaviours: { [keyId]: { status, body } }
  return async (url, init, key) => {
    const behaviour = keyBehaviours[key.id] ?? { status: 200, body: '{"ok":true}' };
    return {
      ok: behaviour.status < 400,
      status: behaviour.status,
      _body: behaviour.body,
    };
  };
}

const errorLog = [];
const successLog = [];
const onError = async (id) => errorLog.push(id);
const onSuccess = async (id) => successLog.push(id);

function resetLogs() { errorLog.length = 0; successLog.length = 0; }

const simpleBuilder = (apiKey) => ({ url: "https://api.openai.com/v1/chat/completions", init: { headers: { Authorization: `Bearer ${apiKey}` } } });

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log(B(C("\n══════════════════════════════════════════════")));
console.log(B(C("  NanaTwo Fallback Engine — Test Suite")));
console.log(B(C("══════════════════════════════════════════════\n")));

// ── Test 1: Primary key works, no fallback needed ────────────────────────────
console.log(Y("Test 1: Primary key succeeds — no fallback"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-good", 1), makeKey("key-2", "sk-backup", 2)];
  const mockFetch = mockFetchFactory({ "key-1": { status: 200, body: '{"choices":[]}' } });
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.usedKeyId === "key-1", "Used primary key");
  assert(result.fallbackUsed === false, "fallbackUsed is false");
  assert(result.attempts === 1, "Only 1 attempt");
  assert(successLog.includes("key-1"), "Primary key marked as success");
  assert(!errorLog.includes("key-1"), "Primary key NOT marked as error");
}

// ── Test 2: Primary key 401 → auto fallback to key 2 ────────────────────────
console.log(Y("\nTest 2: Primary key returns 401 → fallback to key 2"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-invalid", 1), makeKey("key-2", "sk-good", 2)];
  const mockFetch = mockFetchFactory({
    "key-1": { status: 401, body: '{"error":{"message":"Invalid API key"}}' },
    "key-2": { status: 200, body: '{"choices":[{"message":{"content":"Hello!"}}]}' },
  });
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.usedKeyId === "key-2", "Used fallback key-2");
  assert(result.fallbackUsed === true, "fallbackUsed is true");
  assert(result.attempts === 2, "2 attempts made");
  assert(errorLog.includes("key-1"), "Primary key marked as error");
  assert(successLog.includes("key-2"), "Fallback key marked as success");
}

// ── Test 3: Primary key 429 (rate limit) → fallback ─────────────────────────
console.log(Y("\nTest 3: Primary key returns 429 rate limit → fallback"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-ratelimited", 1), makeKey("key-2", "sk-fresh", 2)];
  const mockFetch = mockFetchFactory({
    "key-1": { status: 429, body: '{"error":{"message":"Rate limit exceeded"}}' },
    "key-2": { status: 200, body: '{"choices":[]}' },
  });
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.usedKeyId === "key-2", "Used fallback after rate limit");
  assert(result.fallbackUsed === true, "fallbackUsed is true");
  assert(errorLog.includes("key-1"), "Rate-limited key marked as error");
}

// ── Test 4: Primary 401, fallback 1 also 429, fallback 2 succeeds ────────────
console.log(Y("\nTest 4: key-1 fails 401, key-2 fails 429, key-3 succeeds"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-bad", 1), makeKey("key-2", "sk-limited", 2), makeKey("key-3", "sk-good", 3)];
  const mockFetch = mockFetchFactory({
    "key-1": { status: 401, body: "Unauthorized" },
    "key-2": { status: 429, body: "Too Many Requests" },
    "key-3": { status: 200, body: '{"choices":[]}' },
  });
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.usedKeyId === "key-3", "Used key-3 after two failures");
  assert(result.attempts === 3, "3 attempts made");
  assert(result.fallbackUsed === true, "fallbackUsed is true");
  assert(errorLog.includes("key-1") && errorLog.includes("key-2"), "Both failed keys marked as error");
  assert(successLog.includes("key-3"), "key-3 marked as success");
}

// ── Test 5: All keys fail → returns 503 ─────────────────────────────────────
console.log(Y("\nTest 5: All keys fail → returns 503 gateway error"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-bad1", 1), makeKey("key-2", "sk-bad2", 2)];
  const mockFetch = mockFetchFactory({
    "key-1": { status: 401, body: "Invalid key" },
    "key-2": { status: 403, body: "Forbidden" },
  });
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.response.status === 403, "Returns last error response (403)");
  assert(result.fallbackUsed === true, "fallbackUsed is true");
  assert(result.attempts === 2, "Tried all 2 keys");
  assert(result.usedKeyId === "", "No successful key ID");
}

// ── Test 6: No keys configured → throws ─────────────────────────────────────
console.log(Y("\nTest 6: No keys configured → throws error"));
{
  resetLogs();
  let threw = false;
  try {
    await fetchWithFallback([], simpleBuilder, async () => {}, onError, onSuccess);
  } catch (e) {
    threw = true;
    assert(e.message.includes("No active API keys"), "Correct error message thrown");
  }
  assert(threw, "Error was thrown");
}

// ── Test 7: 400 bad request does NOT trigger fallback ────────────────────────
console.log(Y("\nTest 7: 400 bad request — does NOT trigger fallback (key is fine)"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-good", 1), makeKey("key-2", "sk-backup", 2)];
  const mockFetch = mockFetchFactory({
    "key-1": { status: 400, body: '{"error":{"message":"Invalid model name"}}' },
  });
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.usedKeyId === "key-1", "Stayed on key-1 (400 is not a key error)");
  assert(result.fallbackUsed === false, "No fallback triggered");
  assert(result.attempts === 1, "Only 1 attempt");
  assert(successLog.includes("key-1"), "key-1 marked success (key itself is valid)");
}

// ── Test 8: Error body pattern match triggers fallback ───────────────────────
console.log(Y("\nTest 8: 200-ish status but error body pattern → fallback"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-quota", 1), makeKey("key-2", "sk-good", 2)];
  const mockFetch = mockFetchFactory({
    "key-1": { status: 500, body: '{"error":{"message":"insufficient_quota"}}' },
    "key-2": { status: 200, body: '{"choices":[]}' },
  });
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.usedKeyId === "key-2", "Fell back after quota error");
  assert(result.fallbackUsed === true, "fallbackUsed is true");
}

// ── Test 9: Network error on primary → fallback ──────────────────────────────
console.log(Y("\nTest 9: Network error on primary → fallback to key-2"));
{
  resetLogs();
  const keys = [makeKey("key-1", "sk-offline", 1), makeKey("key-2", "sk-online", 2)];
  const mockFetch = async (url, init, key) => {
    if (key.id === "key-1") throw new Error("ECONNREFUSED");
    return { ok: true, status: 200, _body: '{"choices":[]}' };
  };
  const result = await fetchWithFallback(keys, simpleBuilder, mockFetch, onError, onSuccess);
  assert(result.usedKeyId === "key-2", "Used key-2 after network error on key-1");
  assert(result.fallbackUsed === true, "fallbackUsed is true");
  assert(errorLog.includes("key-1"), "key-1 marked as error after network failure");
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(B(C("\n══════════════════════════════════════════════")));
console.log(`  ${G(`${passed} passed`)}  ${failed > 0 ? R(`${failed} failed`) : G("0 failed")}`);
console.log(B(C("══════════════════════════════════════════════\n")));

if (failed > 0) process.exit(1);
