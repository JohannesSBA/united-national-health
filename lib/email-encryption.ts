import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

let cachedKey: Buffer | null = null;

function getEncryptionKey() {
  if (cachedKey) return cachedKey;
  const rawSecret = process.env.EMAIL_LOG_SECRET;
  if (!rawSecret) {
    return null;
  }
  cachedKey = createHash("sha256").update(rawSecret).digest();
  return cachedKey;
}

export function isEmailEncryptionEnabled() {
  return Boolean(getEncryptionKey());
}

export function encryptEmailBody(plain: string) {
  const key = getEncryptionKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptEmailBody(ciphertext: string) {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("EMAIL_LOG_SECRET is not configured");
  }
  const buffer = Buffer.from(ciphertext, "base64");
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
