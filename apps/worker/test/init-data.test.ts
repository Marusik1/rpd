import { describe, expect, it } from 'vitest';
import { validateInitData } from '../src/init-data.js';

const TOKEN = '123456:TEST_TOKEN';
const VALID =
  'auth_date=2000000000&query_id=fixed-query&user=%7B%22id%22%3A424242%2C%22first_name%22%3A%22%D0%98%D0%B2%D0%B0%D0%BD%22%7D&hash=86e22f30f8a565b0ed627535e1c8a55adc82d309a32f162bbc3335fcd08632a3';

describe('validateInitData', () => {
  it('validates a fixed vector and returns only the identity', async () => {
    await expect(validateInitData(VALID, TOKEN, 2_000_000_100)).resolves.toEqual({ id: 424242 });
  });
  it.each([
    VALID.replace('fixed-query', 'changed'),
    VALID.replace('auth_date=2000000000', 'auth_date=not-a-date'),
    VALID.replace('&hash=', '&user=%7B%22id%22%3A1%7D&hash='),
    VALID.replace(/&hash=.*/u, ''),
    VALID.replace(/&user=.*?&hash=/u, '&hash='),
    VALID.replace(/auth_date=.*?&/u, ''),
    `${VALID}&broken=%ZZ`,
  ])('rejects forged or malformed data', async (candidate) => {
    await expect(validateInitData(candidate, TOKEN, 2_000_000_100)).rejects.toThrow('Invalid Telegram authentication data');
  });
  it('rejects stale and unreasonably future data', async () => {
    await expect(validateInitData(VALID, TOKEN, 2_000_000_901)).rejects.toThrow();
    await expect(validateInitData(VALID, TOKEN, 1_999_999_969)).rejects.toThrow();
  });
});
