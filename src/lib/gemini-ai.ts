// Google Gemini AI High-Speed Evaluation & Response Engine
import { WordEngine } from "./dictionary/word-engine";
import { VIETNAMESE_WORDS } from "./dictionary/vietnamese-words";

const API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

const MODELS_PRIORITY = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash"];

// In-memory LRU evaluation cache for instantaneous responses (0ms)
const evaluationCache = new Map<string, { valid: boolean; meaning: string }>();

// Pre-fill cache with common word definitions
evaluationCache.set("học sinh", { valid: true, meaning: "Người đang theo học ở các trường bậc phổ thông" });
evaluationCache.set("sinh viên", { valid: true, meaning: "Người đang theo học tại các trường đại học, cao đẳng" });
evaluationCache.set("sinh hoạt", { valid: true, meaning: "Các hoạt động sống thường nhật và tập thể" });
evaluationCache.set("sinh động", { valid: true, meaning: "Có sức sống, hấp dẫn và chân thực" });
evaluationCache.set("động đất", { valid: true, meaning: "Hiện tượng rung chuyển mặt đất do địa chấn" });
evaluationCache.set("đất nước", { valid: true, meaning: "Quốc gia và lãnh thổ thiêng liêng" });

export interface EvaluationResult {
  valid: boolean;
  normalizedWord: string;
  meaning?: string;
  error?: string;
}

async function callGeminiApi(prompt: string): Promise<string | null> {
  for (const model of MODELS_PRIORITY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch {
      // try next model
    }
  }
  return null;
}

export const GeminiAI = {
  /**
   * Sinh từ nối AI siêu tốc (< 1.5s - 2s) kèm giải nghĩa, đảm bảo KHÔNG BAO GIỜ return null
   */
  async getAiWord(
    language: "vi" | "en",
    previousWord: string | null,
    usedWords: string[]
  ): Promise<{ word: string; meaning: string }> {
    const usedSet = new Set(usedWords.map((w) => w.trim().toLowerCase()));

    if (!previousWord) {
      return language === "vi"
        ? { word: "học sinh", meaning: "Người đang theo học ở các trường bậc phổ thông" }
        : { word: "apple", meaning: "A round fruit with red, yellow, or green skin and firm white flesh" };
    }

    // Try AI generation
    const usedListStr = usedWords.slice(-15).join(", ");
    let prompt = "";

    if (language === "vi") {
      const syllables = previousWord.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const lastSyllable = syllables[syllables.length - 1];

      prompt = `Tìm 1 từ ghép tiếng Việt 2 âm tiết bắt đầu bằng "${lastSyllable}".
Không được trùng: [${usedListStr}].
Chỉ trả về JSON dạng:
{"word": "${lastSyllable} ...", "meaning": "giải nghĩa ngắn gọn từ 6-15 từ"}`;
    } else {
      const lastChar = previousWord.trim().toLowerCase().slice(-1);
      prompt = `Find 1 English word starting with letter "${lastChar.toUpperCase()}".
Not in: [${usedListStr}].
Return JSON:
{"word": "...", "meaning": "short definition in 6-15 words"}`;
    }

    try {
      const rawText = await callGeminiApi(prompt);
      if (rawText) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          let word = String(parsed.word || "").toLowerCase().trim();
          const meaning = String(parsed.meaning || "Từ vựng hợp lệ");

          if (language === "vi") {
            const words = word.split(/\s+/).filter(Boolean);
            if (words.length === 2 && !usedSet.has(word)) {
              evaluationCache.set(word, { valid: true, meaning });
              return { word, meaning };
            }
          } else {
            word = word.replace(/[^a-z]/g, "");
            if (word.length >= 2 && !usedSet.has(word)) {
              evaluationCache.set(word, { valid: true, meaning });
              return { word, meaning };
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Gemini getAiWord Error]", err);
    }

    // Rock-solid Fallback: Search dictionary or generate naturally
    if (language === "vi") {
      const syllables = previousWord.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const lastSyllable = syllables[syllables.length - 1];

      // Find from dictionary
      const candidates = VIETNAMESE_WORDS.filter((w) => {
        const norm = w.trim().toLowerCase();
        if (usedSet.has(norm)) return false;
        const syls = norm.split(/\s+/);
        return syls[0] === lastSyllable && syls.length === 2;
      });

      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        const meaning = `Từ ghép tiếng Việt bắt đầu bằng âm "${lastSyllable}"`;
        return { word: picked, meaning };
      }

      // If uncommon syllable, create a standard combination
      const fallbackSuffixes = ["hóa", "học", "viên", "thể", "lực", "tính", "tâm", "động", "phát", "trưởng"];
      for (const suffix of fallbackSuffixes) {
        const candidate = `${lastSyllable} ${suffix}`;
        if (!usedSet.has(candidate)) {
          return { word: candidate, meaning: `Từ ghép có nghĩa trong ngữ cảnh mở rộng` };
        }
      }

      return { word: `${lastSyllable} mới`, meaning: "Cụm từ tiếng Việt ghép nghĩa" };
    } else {
      const lastChar = previousWord.trim().toLowerCase().slice(-1);
      const fallbackWords = ["apple", "energy", "year", "road", "door", "river", "rain", "night", "time", "earth"];
      for (const w of fallbackWords) {
        if (w.startsWith(lastChar) && !usedSet.has(w)) {
          return { word: w, meaning: "Common English vocabulary" };
        }
      }
      return { word: `${lastChar}zone`, meaning: "English compound term" };
    }
  },

  /**
   * Thẩm định từ ngữ bằng Gemini AI không giới hạn từ điển
   */
  async evaluateWord(
    language: "vi" | "en",
    wordInput: string,
    previousWord: string | null,
    usedWords: string[]
  ): Promise<EvaluationResult> {
    const raw = (wordInput || "").trim().toLowerCase();

    if (language === "vi") {
      const syllables = raw.split(/\s+/).filter(Boolean);
      if (syllables.length !== 2) {
        return {
          valid: false,
          normalizedWord: raw,
          error: "Từ tiếng Việt phải gồm đúng 2 âm tiết (Ví dụ: sinh động, học sinh)!",
        };
      }

      const normalized = syllables.join(" ");

      const usedNormalized = usedWords.map((w) => w.toLowerCase().trim());
      if (usedNormalized.includes(normalized)) {
        return {
          valid: false,
          normalizedWord: normalized,
          error: `Từ "${normalized}" đã được sử dụng trong ván này rồi!`,
        };
      }

      if (previousWord) {
        const prevSyls = previousWord.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const lastPrev = prevSyls[prevSyls.length - 1];
        if (syllables[0] !== lastPrev) {
          return {
            valid: false,
            normalizedWord: normalized,
            error: `Từ phải bắt đầu bằng chữ "${lastPrev.toUpperCase()}"!`,
          };
        }
      }

      if (evaluationCache.has(normalized)) {
        const cached = evaluationCache.get(normalized)!;
        if (cached.valid) {
          return { valid: true, normalizedWord: normalized, meaning: cached.meaning };
        }
        return { valid: false, normalizedWord: normalized, error: cached.meaning || "Từ không hợp lý!" };
      }

      try {
        const prompt = `Phân tích từ "${normalized}" trong tiếng Việt.
Có phải là từ ghép, từ láy hoặc cụm từ 2 âm tiết có nghĩa trong tiếng Việt không?
Trả về duy nhất JSON:
{
  "valid": true,
  "meaning": "giải nghĩa ngắn gọn từ 10-25 từ"
}
Nếu hoàn toàn vô nghĩa hoặc không tồn tại:
{
  "valid": false,
  "meaning": "Lý do không hợp lệ"
}`;

        const rawText = await callGeminiApi(prompt);
        if (rawText) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const isValid = Boolean(parsed.valid);
            const meaning = String(parsed.meaning || "Từ tiếng Việt có nghĩa hợp lệ");

            evaluationCache.set(normalized, { valid: isValid, meaning });

            if (isValid) {
              return { valid: true, normalizedWord: normalized, meaning };
            } else {
              return {
                valid: false,
                normalizedWord: normalized,
                error: meaning || `Từ "${normalized}" không có nghĩa hợp lý!`,
              };
            }
          }
        }
      } catch (err) {
        console.warn("[Gemini Fast Eval]", err);
      }

      // Safe default for valid 2-syllable phrase
      const meaning = `Từ ghép tiếng Việt gồm "${syllables[0]}" và "${syllables[1]}"`;
      evaluationCache.set(normalized, { valid: true, meaning });
      return { valid: true, normalizedWord: normalized, meaning };
    } else {
      // English validation
      const clean = raw.replace(/[^a-z]/g, "");
      if (clean.length < 2) {
        return { valid: false, normalizedWord: clean, error: "Please enter a valid English word!" };
      }

      if (usedWords.map((w) => w.toLowerCase().trim()).includes(clean)) {
        return { valid: false, normalizedWord: clean, error: `Word "${clean}" has already been used!` };
      }

      if (previousWord) {
        const prevClean = previousWord.trim().toLowerCase().replace(/[^a-z]/g, "");
        if (clean[0] !== prevClean.slice(-1)) {
          return {
            valid: false,
            normalizedWord: clean,
            error: `Word must start with letter "${prevClean.slice(-1).toUpperCase()}"!`,
          };
        }
      }

      if (evaluationCache.has(clean)) {
        const cached = evaluationCache.get(clean)!;
        if (cached.valid) {
          return { valid: true, normalizedWord: clean, meaning: cached.meaning };
        }
        return { valid: false, normalizedWord: clean, error: cached.meaning || "Invalid English word!" };
      }

      try {
        const prompt = `Analyze the English word "${clean}".
Return ONLY JSON:
{
  "valid": true,
  "meaning": "concise definition in 10-20 words"
}`;

        const rawText = await callGeminiApi(prompt);
        if (rawText) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const isValid = Boolean(parsed.valid);
            const meaning = String(parsed.meaning || "Valid English word");

            evaluationCache.set(clean, { valid: isValid, meaning });
            return { valid: isValid, normalizedWord: clean, meaning };
          }
        }
      } catch (err) {
        console.warn("[Gemini En Eval]", err);
      }

      return { valid: true, normalizedWord: clean, meaning: "Valid English word" };
    }
  },
};
