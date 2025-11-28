import { customAlphabet } from 'nanoid';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
const SHORT_CODE_LENGTH = 7;
const nanoid = customAlphabet(ALPHABET, SHORT_CODE_LENGTH);

export function generateShortCode(): string {
  return nanoid();
}
