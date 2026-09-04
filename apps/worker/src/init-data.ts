const MAX_AGE_SECONDS = 15 * 60;
const MAX_FUTURE_SECONDS = 30;

export type TelegramIdentity = { id: number };

export class InitDataError extends Error {
  constructor() {
    super('Invalid Telegram authentication data');
    this.name = 'InitDataError';
  }
}

function parseUnique(input: string): Map<string, string> {
  if (/%(?![a-f\d]{2})/iu.test(input)) throw new InitDataError();
  const params = new URLSearchParams(input);
  const values = new Map<string, string>();
  for (const [key, value] of params) {
    if (values.has(key)) throw new InitDataError();
    values.set(key, value);
  }
  return values;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f\d]{64}$/iu.test(left) || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

export async function validateInitData(
  rawInitData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<TelegramIdentity> {
  try {
    if (!rawInitData || !botToken) throw new InitDataError();
    const params = parseUnique(rawInitData);
    const suppliedHash = params.get('hash');
    const rawUser = params.get('user');
    const rawAuthDate = params.get('auth_date');
    if (!suppliedHash || !rawUser || !rawAuthDate || !/^\d+$/u.test(rawAuthDate)) throw new InitDataError();

    const authDate = Number(rawAuthDate);
    if (!Number.isSafeInteger(authDate) || nowSeconds - authDate > MAX_AGE_SECONDS || authDate - nowSeconds > MAX_FUTURE_SECONDS) {
      throw new InitDataError();
    }
    const checkString = [...params.entries()]
      .filter(([key]) => key !== 'hash')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    const secret = await hmac(new TextEncoder().encode('WebAppData'), botToken);
    const calculatedHash = bytesToHex(new Uint8Array(await hmac(secret, checkString)));
    if (!safeEqualHex(suppliedHash, calculatedHash)) throw new InitDataError();

    const user: unknown = JSON.parse(rawUser);
    if (!user || typeof user !== 'object' || !('id' in user)) throw new InitDataError();
    const id = (user as { id?: unknown }).id;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) throw new InitDataError();
    return { id };
  } catch (error) {
    if (error instanceof InitDataError) throw error;
    throw new InitDataError();
  }
}
