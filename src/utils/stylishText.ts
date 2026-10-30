/**
 * Wazeh (Clear & Prominent) Stylish Typography Formatter
 * Hanzla Croex Technology / Mudasir Voting Center
 *
 * Provides ONE clean, high-contrast, prominent bold style that is 100% readable
 * and looks crisp on all mobile screens, WhatsApp shares, and live voting cards.
 */

// Mathematical Bold Sans Unicode Map (A-Z, a-z, 0-9) - Maximum readability and clarity
const BOLD_SANS_MAP: Record<string, string> = {
  a: '𝗮', b: '𝗯', c: '𝗰', d: '𝗱', e: '𝗲', f: '𝗳', g: '𝗴', h: '𝗵', i: '𝗶', j: '𝗷',
  k: '𝗸', l: '𝗹', m: '𝗺', n: '𝗻', o: '𝗼', p: '𝗽', q: '𝗾', r: '𝗿', s: '𝘀', t: '𝘁',
  u: '𝘂', v: '𝘃', w: '𝘄', x: '𝘅', y: '𝘆', z: '𝘇',
  A: '𝗔', B: '𝗕', C: '𝗖', D: '𝗗', E: '𝗘', F: '𝗙', G: '𝗚', H: '𝗛', I: '𝗜', J: '𝗝',
  K: '𝗞', L: '𝗟', M: '𝗠', N: '𝗡', O: '𝗢', P: '𝗣', Q: '𝗤', R: '𝗥', S: '𝗦', T: '𝗧',
  U: '𝗨', V: '𝗩', W: '𝗪', X: '𝗫', Y: '𝗬', Z: '𝗭',
  '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
};

// Reverse map to restore standard plain text
const REVERSE_BOLD_SANS_MAP: Record<string, string> = {};
for (const [plain, bold] of Object.entries(BOLD_SANS_MAP)) {
  REVERSE_BOLD_SANS_MAP[bold] = plain;
}

// Check if string contains Urdu / Arabic characters
export function isUrduText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Converts text into ONE single, clear, prominent style (واضح اسٹائل)
 * - English/Numbers: Crisp Unicode Bold Sans (high visibility)
 * - Urdu: Clean, prominent formatting without clutter
 */
export function toWazehStylish(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return text;

  // If text already has wazeh formatting, return as is
  if (isAlreadyWazeh(trimmed)) {
    return trimmed;
  }

  // If pure Urdu without English letters, format with clean wazeh border
  if (isUrduText(trimmed) && !/[a-zA-Z]/.test(trimmed)) {
    // Clean, crisp wazeh bracket that makes Urdu text stand out boldly
    return `【 ${trimmed} 】`;
  }

  // Convert English and numbers to Bold Sans
  let result = '';
  for (const char of trimmed) {
    result += BOLD_SANS_MAP[char] || char;
  }
  return result;
}

/**
 * Restores text back to standard plain text
 */
export function toNormalText(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Remove framing brackets if present
  if (cleaned.startsWith('【') && cleaned.endsWith('】')) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Convert Unicode bold characters back to standard plain characters
  let normal = '';
  for (const char of Array.from(cleaned)) {
    normal += REVERSE_BOLD_SANS_MAP[char] || char;
  }
  return normal;
}

/**
 * Checks if text is already styled in the wazeh format
 */
export function isAlreadyWazeh(text: string): boolean {
  if (!text) return false;
  if (text.startsWith('【') && text.endsWith('】')) return true;
  for (const char of Array.from(text)) {
    if (REVERSE_BOLD_SANS_MAP[char]) return true;
  }
  return false;
}

export interface TextStyleOption {
  id: string;
  name: string;
  styled: string;
  hasEmoji: boolean;
  category: string;
}

/**
 * Kept for backwards compatibility: returns only the ONE wazeh style
 */
export function generateStylishVariations(text: string): TextStyleOption[] {
  if (!text || !text.trim()) return [];
  const wazeh = toWazehStylish(text);
  return [
    {
      id: 'wazeh_primary',
      name: 'واضح اسٹائل (Wazeh Bold)',
      styled: wazeh,
      hasEmoji: false,
      category: 'wazeh',
    },
  ];
}
