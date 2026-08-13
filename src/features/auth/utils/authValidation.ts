const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return emailPattern.test(value.trim());
}

export const minPasswordLength = 8;

export function isValidPassword(value: string): boolean {
  return value.length >= minPasswordLength;
}
