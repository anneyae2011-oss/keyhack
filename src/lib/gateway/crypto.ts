import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGO = "aes-256-gcm";

function getSecret(): Buffer {
  const s = process.env.GATEWAY_SECRET ?? "default-secret-change-me-in-prod!";
  return Buffer.from(s.padEnd(32, "0").slice(0, 32));
}

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, getSecret(), iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decrypt(data: string): string {
  const [ivHex, tagHex, encHex] = data.split(":");
  const decipher = createDecipheriv(ALGO, getSecret(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
}

export function hashKey(key: string): string {
  return createHmac("sha256", getSecret()).update(key).digest("hex");
}

export function generateGatewayKey(): string {
  return `ntw_${randomBytes(24).toString("base64url")}`;
}
