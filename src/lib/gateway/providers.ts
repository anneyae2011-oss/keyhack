/**
 * Provider-specific request builders for the fallback engine.
 * Each builder takes an API key and returns { url, init } for fetch().
 */

export function buildOpenAIRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.openai.com/v1/chat/completions",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
  };
}

export function buildAnthropicRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.anthropic.com/v1/messages",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    },
  };
}

export function buildGoogleRequest(apiKey: string, body: unknown, model = "gemini-1.5-flash"): { url: string; init: RequestInit } {
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  };
}

export function buildCohereRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.cohere.ai/v1/chat",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
  };
}

export function buildMistralRequest(apiKey: string, body: unknown): { url: string; init: RequestInit } {
  return {
    url: "https://api.mistral.ai/v1/chat/completions",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
  };
}
