import { webcrypto } from "crypto";

// #############
// ### Utils ###
// #############

// Function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

// Function to convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return Buffer.from(base64, "base64");
}

// ################
// ### RSA keys ###
// ################

// Generates a pair of private / public RSA keys
type GenerateRsaKeyPair = {
  publicKey: webcrypto.CryptoKey;
  privateKey: webcrypto.CryptoKey;
};

export async function generateRsaKeyPair(): Promise<GenerateRsaKeyPair> {
  // Generate RSA key pair
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  // Return the generated keys in the same structure as requested
  return { 
    publicKey: keyPair.publicKey, 
    privateKey: keyPair.privateKey 
  };
}

// Export a crypto public key to a base64 string format
export async function exportPubKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exportedKey);
}

// Export a crypto private key to a base64 string format
export async function exportPrvKey(
  key: webcrypto.CryptoKey | null
): Promise<string | null> {
  if (!key) {
    return null;
  }
  const exportedKey = await webcrypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string public key to its native format
export async function importPubKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const arrayBuffer = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "spki",
    arrayBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
  return importedKey;
}

// Import a base64 string private key to its native format
export async function importPrvKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const arrayBuffer = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "pkcs8",
    arrayBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
  return importedKey;
}

// Encrypt a message using an RSA public key
export async function rsaEncrypt(
  data: string,
  strPublicKey: string
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const publicKey = await importPubKey(strPublicKey);
  const encryptedData = await webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    dataBuffer
  );
  return arrayBufferToBase64(encryptedData);
}

// Decrypts a message using an RSA private key
export async function rsaDecrypt(
  encryptedData: string,
  privateKey: webcrypto.CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedData);
  const decryptedData = await webcrypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBuffer
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// ######################
// ### Symmetric keys ###
// ######################

// Generates a random symmetric key
export async function createRandomSymmetricKey(): Promise<webcrypto.CryptoKey> {
  const symmetricKey = await webcrypto.subtle.generateKey(
    {
      name: "AES-CBC",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
  return symmetricKey;
}

// Export a crypto symmetric key to a base64 string format
export async function exportSymKey(key: webcrypto.CryptoKey): Promise<string> {
  const exportedKey = await webcrypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exportedKey);
}

// Import a base64 string format to its crypto native format
export async function importSymKey(
  strKey: string
): Promise<webcrypto.CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(strKey);
  const importedKey = await webcrypto.subtle.importKey(
    "raw",
    keyBuffer,
    {name: "AES-CBC"},
    true,
    ["encrypt", "decrypt"]
  );
  return importedKey;
}

// Encrypt a message using a symmetric key
export async function symEncrypt(
  key: webcrypto.CryptoKey,
  data: string
): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = webcrypto.getRandomValues(new Uint8Array(16));
  const encryptedData = await webcrypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv : iv
    },
    key,
    dataBuffer
  );
  const combinedData = new Uint8Array(iv.length + encryptedData.byteLength);
  combinedData.set(iv, 0);
  combinedData.set(new Uint8Array(encryptedData), iv.length);
  return arrayBufferToBase64(combinedData.buffer);
}

// Decrypt a message using a symmetric key
export async function symDecrypt(
  strKey: string,
  encryptedData: string
): Promise<string> {
  const encryptedDataBuffer = base64ToArrayBuffer(encryptedData);
  const iv = new Uint8Array(encryptedDataBuffer.slice(0, 16));
  const ciphertext = new Uint8Array(encryptedDataBuffer.slice(16));
  const key = await importSymKey(strKey);
  const decryptedBuffer = await webcrypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: iv
    },
    key,
    ciphertext
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}