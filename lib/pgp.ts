'use client'

// Dynamic import to avoid SSR issues
let openpgp: any = null;

async function getOpenPGP() {
  if (!openpgp && typeof window !== 'undefined') {
    openpgp = await import('openpgp');
  }
  return openpgp;
}

export async function encryptData(data: string, passphrase: string) {
  const pgp = await getOpenPGP();
  if (!pgp) {
    throw new Error('OpenPGP is not available in this environment');
  }
  
  const encrypted = await pgp.encrypt({
    message: await pgp.createMessage({ text: data }),
    passwords: [passphrase],
    format: 'armored',
  });
  return encrypted;
}

export async function decryptData(encryptedData: string, passphrase: string) {
  const pgp = await getOpenPGP();
  if (!pgp) {
    throw new Error('OpenPGP is not available in this environment');
  }
  
  const message = await pgp.readMessage({
    armoredMessage: encryptedData,
  });
  const { data: decrypted } = await pgp.decrypt({
    message,
    passwords: [passphrase],
  });
  return decrypted;
}
