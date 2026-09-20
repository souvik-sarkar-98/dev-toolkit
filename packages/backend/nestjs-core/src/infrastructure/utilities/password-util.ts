import { randomInt } from 'crypto';

interface PasswordOptions {
  length: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
}

export function generatePassword(options: PasswordOptions): string {
  const {
    length,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options;

  const sets = [
    { enabled: includeUppercase, chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
    { enabled: includeLowercase, chars: 'abcdefghijklmnopqrstuvwxyz' },
    { enabled: includeNumbers, chars: '0123456789' },
    { enabled: includeSymbols, chars: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
  ];

  const activeSets = sets.filter((s) => s.enabled);
  if (activeSets.length === 0) {
    throw new Error('At least one character type must be included.');
  }

  if (length < activeSets.length) {
    throw new Error(
      `Password length must be at least ${activeSets.length} to include all character types.`,
    );
  }

  let password = '';

  // Guarantee at least one of each active set
  activeSets.forEach((set) => {
    const randomIndex = randomInt(0, set.chars.length);
    password += set.chars[randomIndex];
  });

  // Fill the rest of the length
  const allChars = activeSets.map((s) => s.chars).join('');
  for (let i = password.length; i < length; i++) {
    const randomIndex = randomInt(0, allChars.length);
    password += allChars[randomIndex];
  }

  // Fisher-Yates shuffle for true randomness
  const passwordArray = password.split('');
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join('');
}

/**
 * Generates an n-digit number with all unique digits.
 * @param n Number of digits (1 to 10)
 * @returns A unique n-digit number
 * @throws Error if n is out of range
 */
export function generateUniqueNDigitNumber(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw new Error('n must be an integer between 1 and 10 (inclusive).');
  }

  const digits: number[] = Array.from({ length: 10 }, (_, i) => i);

  if (n > 1) {
    const nonZeroIndex = Math.floor(Math.random() * 9) + 1;
    const firstDigit = digits.splice(nonZeroIndex, 1)[0];
    const resultDigits = [firstDigit];

    for (let i = 1; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      resultDigits.push(digits.splice(randomIndex, 1)[0]);
    }

    return parseInt(resultDigits.join(''), 10);
  } else {
    return digits[Math.floor(Math.random() * 10)];
  }
}
