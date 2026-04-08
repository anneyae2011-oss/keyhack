/**
 * Auto-migration: creates all tables if they don't exist.
 * Called at the top of every API route so the DB self-initializes on first deploy.
 */
import { neon } from "@neondatabase/serverless";

let migrated = false; // in-process cache — only runs once per cold start

export async function ensureTables() {
  if (migrated) return;
  const sql = neon(process.env.DATABASE_URL!);

  await sql`
    CREATE TABLE IF NOT EXISTS gateway_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      total_requests INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS provider_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL,
      name TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      key_preview TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true,
      error_count INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      last_error_at TIMESTAMPTZ,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      custom_endpoint TEXT,
      custom_auth_style TEXT,
      custom_auth_header TEXT,
      custom_auth_query TEXT,
      custom_headers JSONB
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS request_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gateway_key_id UUID REFERENCES gateway_keys(id),
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      provider_key_id UUID REFERENCES provider_keys(id),
      status INTEGER NOT NULL,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      latency_ms INTEGER,
      error TEXT,
      fallback_used BOOLEAN NOT NULL DEFAULT false,
      fallback_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  migrated = true;
}
