const encoder = new TextEncoder();

function normalizePem(pem: string) {
  return pem.replace(/\\n/g, "\n").trim();
}

function pemToArrayBuffer(pem: string) {
  const normalized = normalizePem(pem)
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function randomNonce(size = 16) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function rsaSha256Sign(message: string, privateKeyPem: string) {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(message)
  );
  return base64(signature);
}

export async function rsaSha256Verify(
  message: string,
  signatureBase64: string,
  publicKeyPem: string
) {
  const key = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );
  const signature = Uint8Array.from(atob(signatureBase64), (char) => char.charCodeAt(0));
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    encoder.encode(message)
  );
}

export async function decryptWechatResource({
  apiV3Key,
  associatedData,
  nonce,
  ciphertext
}: {
  apiV3Key: string;
  associatedData?: string;
  nonce: string;
  ciphertext: string;
}) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiV3Key),
    "AES-GCM",
    false,
    ["decrypt"]
  );
  const cipherBytes = Uint8Array.from(atob(ciphertext), (char) => char.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: encoder.encode(nonce),
      additionalData: associatedData ? encoder.encode(associatedData) : undefined,
      tagLength: 128
    },
    key,
    cipherBytes
  );
  return new TextDecoder().decode(plain);
}

export function canonicalQuery(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([key]) => key !== "sign" && key !== "sign_type")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}
