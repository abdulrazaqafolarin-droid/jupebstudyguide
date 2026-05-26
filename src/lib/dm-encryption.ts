import { supabase } from '@/integrations/supabase/client';

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes.buffer;
}

export async function generateIdentityKeyPair(): Promise<{ publicKey: string; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );
  const rawPublic = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  return { publicKey: arrayBufferToBase64(rawPublic), privateKey: keyPair.privateKey };
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('pkcs8', key);
  return arrayBufferToBase64(raw);
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    base64ToArrayBuffer(pem),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(base64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );
}

async function deriveSharedSecret(myPrivateKey: CryptoKey, theirPublicBase64: string): Promise<ArrayBuffer> {
  const theirPublic = await importPublicKey(theirPublicBase64);
  return crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirPublic },
    myPrivateKey,
    256,
  );
}

export async function generateConversationKey(
  myPrivateKey: CryptoKey,
  theirPublicBase64: string,
): Promise<{ key: CryptoKey; keyBase64: string }> {
  const sharedSecret = await deriveSharedSecret(myPrivateKey, theirPublicBase64);
  const key = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt'],
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  return { key, keyBase64: arrayBufferToBase64(raw) };
}

export async function importConversationKey(keyBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(keyBase64),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptMessage(
  plaintext: string,
  conversationKey: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    conversationKey,
    TEXT_ENCODER.encode(plaintext),
  );
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  conversationKey: CryptoKey,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(ivBase64)) },
    conversationKey,
    base64ToArrayBuffer(ciphertextBase64),
  );
  return TEXT_DECODER.decode(decrypted);
}

export async function encryptKeyForRecipient(
  conversationKeyBase64: string,
  recipientPublicBase64: string,
  myPrivateKey: CryptoKey,
): Promise<string> {
  const sharedSecret = await deriveSharedSecret(myPrivateKey, recipientPublicBase64);
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    TEXT_ENCODER.encode(conversationKeyBase64),
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return arrayBufferToBase64(combined.buffer);
}

export async function decryptKeyForMe(
  encryptedKeyBase64: string,
  myPrivateKey: CryptoKey,
  senderPublicBase64: string,
): Promise<string> {
  const sharedSecret = await deriveSharedSecret(myPrivateKey, senderPublicBase64);
  const derivedKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedKeyBase64));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    data,
  );
  return TEXT_DECODER.decode(decrypted);
}

export function generateClientMsgId(): string {
  return crypto.randomUUID();
}

const PRIVATE_KEY_STORAGE_KEY = 'jupeb-dm-private-key';

export function stashPrivateKey(pem: string): void {
  try { localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, pem); } catch { }
}

export function loadStashedPrivateKey(): string | null {
  try { return localStorage.getItem(PRIVATE_KEY_STORAGE_KEY); } catch { return null; }
}

export function clearStashedPrivateKey(): void {
  try { localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY); } catch { }
}

export async function ensureIdentityKey(): Promise<{ publicKey: string; privateKey: CryptoKey }> {
  const existingPem = loadStashedPrivateKey();
  if (existingPem) {
    try {
      const privateKey = await importPrivateKey(existingPem);
      const { data } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .maybeSingle();
      if (data?.public_key) {
        return { publicKey: data.public_key, privateKey };
      }
    } catch { }
  }

  const keyPair = await generateIdentityKeyPair();
  const pem = await exportPrivateKey(keyPair.privateKey);
  stashPrivateKey(pem);

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (userId) {
    await supabase.from('profiles').update({ public_key: keyPair.publicKey }).eq('user_id', userId);
  }

  return keyPair;
}
