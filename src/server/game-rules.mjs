// Server-side Game Rules with Gemini AI Evaluation
import { ServerGeminiService } from "./gemini-service.mjs";

export const GameRules = {
  normalizeVi(text) {
    return String(text || "").trim().toLowerCase().replace(/\s+/g, " ").normalize("NFC");
  },

  normalizeEn(text) {
    return String(text || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  },

  async validateWord(wordInput, prevWord, usedWords, language = "vi") {
    if (language === "vi") {
      const word = this.normalizeVi(wordInput);
      if (!word) return { valid: false, error: "Vui lòng nhập từ!" };

      const syllables = word.split(" ").filter(Boolean);
      if (syllables.length !== 2) {
        return { valid: false, error: "Từ tiếng Việt phải có đúng 2 âm tiết (VD: sinh động, học sinh)!" };
      }

      const normalizedUsed = usedWords.map((w) => this.normalizeVi(w));
      if (normalizedUsed.includes(word)) {
        return { valid: false, error: `Từ "${word}" đã được sử dụng trước đó!` };
      }

      if (prevWord) {
        const prevSyllables = this.normalizeVi(prevWord).split(" ").filter(Boolean);
        const lastPrev = prevSyllables[prevSyllables.length - 1];
        const firstCurr = syllables[0];
        if (lastPrev !== firstCurr) {
          return { valid: false, error: `Từ phải bắt đầu bằng chữ "${lastPrev.toUpperCase()}"!` };
        }
      }

      // Thẩm định bằng Gemini AI
      const aiResult = await ServerGeminiService.evaluateWordWithAi("vi", word, prevWord, usedWords);
      if (aiResult.valid) {
        return { valid: true, normalizedWord: word, meaning: aiResult.meaning };
      }

      return { valid: false, error: aiResult.meaning || `Từ "${word}" không có nghĩa hợp lý trong tiếng Việt!` };
    } else {
      // English validation
      const word = this.normalizeEn(wordInput);
      if (!word || word.length < 2) return { valid: false, error: "Please enter a valid English word!" };

      const normalizedUsed = usedWords.map((w) => this.normalizeEn(w));
      if (normalizedUsed.includes(word)) {
        return { valid: false, error: `Word "${word}" has already been used!` };
      }

      if (prevWord) {
        const prev = this.normalizeEn(prevWord);
        const lastChar = prev[prev.length - 1];
        if (word[0] !== lastChar) {
          return { valid: false, error: `Word must start with letter "${lastChar.toUpperCase()}"!` };
        }
      }

      const aiResult = await ServerGeminiService.evaluateWordWithAi("en", word, prevWord, usedWords);
      if (aiResult.valid) {
        return { valid: true, normalizedWord: word, meaning: aiResult.meaning };
      }

      return { valid: false, error: aiResult.meaning || `Word "${word}" is not a valid English word!` };
    }
  },

  getRandomStarter(language = "vi") {
    const starters = ["học sinh", "mùa xuân", "thành phố", "hoa hồng", "biển cả", "mặt trời", "cuộc sống", "ước mơ"];
    if (language === "vi") {
      return starters[Math.floor(Math.random() * starters.length)];
    }
    const enStarters = ["apple", "energy", "planet", "guitar", "nature", "galaxy"];
    return enStarters[Math.floor(Math.random() * enStarters.length)];
  }
};
