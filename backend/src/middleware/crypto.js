const crypto = require('crypto');

const CRYPTO_KEY = process.env.CRYPTO_KEY || crypto.randomBytes(32).toString('hex');
const KEY = Buffer.from(CRYPTO_KEY.slice(0, 64), 'hex');

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(data) {
  if (!data) return null;
  try {
    const [ivHex, encHex] = data.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<[^>]*>/g, '').slice(0, 500);
}

module.exports = { encrypt, decrypt, sanitize };
