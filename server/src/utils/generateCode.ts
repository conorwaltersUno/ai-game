/**
 * Generate a unique 6-character game code
 * Format: Uppercase letters and numbers (excluding confusing chars like O, 0, I, 1)
 */
const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateGameCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS[randomIndex];
  }
  return code;
}

/**
 * Check if a code is valid format
 */
export function isValidGameCode(code: string): boolean {
  if (code.length !== 6) return false;

  for (const char of code) {
    if (!ALLOWED_CHARS.includes(char)) {
      return false;
    }
  }

  return true;
}
