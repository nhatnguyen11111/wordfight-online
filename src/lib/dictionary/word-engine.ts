import { VIETNAMESE_WORDS, VIETNAMESE_WORDS_SET } from "./vietnamese-words";
import { ENGLISH_WORDS, ENGLISH_WORDS_SET } from "./english-words";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedWord: string;
}

export const WordEngine = {
  // Normalize string
  normalizeVi(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, " ").normalize("NFC");
  },

  normalizeEn(text: string): string {
    return text.trim().toLowerCase().replace(/[^a-z]/g, "");
  },

  // Validate Vietnamese compound word chain
  validateVi(wordInput: string, prevWord: string | null, usedWords: string[]): ValidationResult {
    const word = this.normalizeVi(wordInput);

    if (!word) {
      return { valid: false, error: "Vui lòng nhập từ!", normalizedWord: word };
    }

    const syllables = word.split(" ");
    if (syllables.length !== 2) {
      return { valid: false, error: "Từ tiếng Việt phải có đúng 2 âm tiết (Ví dụ: học sinh)!", normalizedWord: word };
    }

    // Check if in dictionary
    if (!VIETNAMESE_WORDS_SET.has(word)) {
      return { valid: false, error: `Từ "${word}" không có trong từ điển!`, normalizedWord: word };
    }

    // Check if duplicate
    const normalizedUsed = usedWords.map((w) => this.normalizeVi(w));
    if (normalizedUsed.includes(word)) {
      return { valid: false, error: `Từ "${word}" đã được sử dụng trước đó!`, normalizedWord: word };
    }

    // Check chain link
    if (prevWord) {
      const prevSyllables = this.normalizeVi(prevWord).split(" ");
      const lastSyllablePrev = prevSyllables[prevSyllables.length - 1];
      const firstSyllableCurrent = syllables[0];

      if (lastSyllablePrev !== firstSyllableCurrent) {
        return {
          valid: false,
          error: `Từ phải bắt đầu bằng chữ "${lastSyllablePrev}" (âm cuối của "${prevWord}")!`,
          normalizedWord: word,
        };
      }
    }

    return { valid: true, normalizedWord: word };
  },

  // Validate English word chain
  validateEn(wordInput: string, prevWord: string | null, usedWords: string[]): ValidationResult {
    const word = this.normalizeEn(wordInput);

    if (!word || word.length < 2) {
      return { valid: false, error: "Vui lòng nhập từ tiếng Anh hợp lệ!", normalizedWord: word };
    }

    if (!ENGLISH_WORDS_SET.has(word)) {
      return { valid: false, error: `Word "${word}" is not in dictionary!`, normalizedWord: word };
    }

    const normalizedUsed = usedWords.map((w) => this.normalizeEn(w));
    if (normalizedUsed.includes(word)) {
      return { valid: false, error: `Word "${word}" has already been used!`, normalizedWord: word };
    }

    if (prevWord) {
      const prev = this.normalizeEn(prevWord);
      const lastCharPrev = prev[prev.length - 1];
      const firstCharCurrent = word[0];

      if (lastCharPrev !== firstCharCurrent) {
        return {
          valid: false,
          error: `Word must start with letter "${lastCharPrev.toUpperCase()}"!`,
          normalizedWord: word,
        };
      }
    }

    return { valid: true, normalizedWord: word };
  },

  // AI Bot responds for Vietnamese
  getAiResponseVi(prevWord: string | null, usedWords: string[]): string | null {
    const normalizedUsed = new Set(usedWords.map((w) => this.normalizeVi(w)));

    if (!prevWord) {
      // Pick a random starter word
      const available = VIETNAMESE_WORDS.filter((w) => !normalizedUsed.has(this.normalizeVi(w)));
      if (available.length === 0) return null;
      return available[Math.floor(Math.random() * available.length)];
    }

    const prevSyllables = this.normalizeVi(prevWord).split(" ");
    const targetFirst = prevSyllables[prevSyllables.length - 1];

    const candidates = VIETNAMESE_WORDS.filter((w) => {
      const norm = this.normalizeVi(w);
      if (normalizedUsed.has(norm)) return false;
      const syllables = norm.split(" ");
      return syllables[0] === targetFirst;
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  },

  // AI Bot responds for English
  getAiResponseEn(prevWord: string | null, usedWords: string[]): string | null {
    const normalizedUsed = new Set(usedWords.map((w) => this.normalizeEn(w)));

    if (!prevWord) {
      const available = ENGLISH_WORDS.filter((e) => !normalizedUsed.has(this.normalizeEn(e.word)));
      if (available.length === 0) return null;
      return available[Math.floor(Math.random() * available.length)].word;
    }

    const prev = this.normalizeEn(prevWord);
    const targetChar = prev[prev.length - 1];

    const candidates = ENGLISH_WORDS.filter((e) => {
      const norm = this.normalizeEn(e.word);
      if (normalizedUsed.has(norm)) return false;
      return norm[0] === targetChar;
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)].word;
  },

  isValidViWord(word: string): boolean {
    return VIETNAMESE_WORDS_SET.has(this.normalizeVi(word));
  },

  isValidEnWord(word: string): boolean {
    return ENGLISH_WORDS_SET.has(this.normalizeEn(word));
  },
};
