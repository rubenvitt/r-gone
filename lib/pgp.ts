import * as openpgp from 'openpgp';

export async function encryptData(data: string, passphrase: string) {
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: data }),
    passwords: [passphrase],
    format: 'armored',
  });
  return encrypted;
}

export async function decryptData(encryptedData: string, passphrase: string) {
  const message = await openpgp.readMessage({
    armoredMessage: encryptedData,
  });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    passwords: [passphrase],
  });
  return decrypted;
}
