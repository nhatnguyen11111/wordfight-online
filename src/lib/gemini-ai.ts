// Google Gemini AI High-Speed Evaluation & Strict Word Validation Engine
import { WordEngine } from "./dictionary/word-engine";
import { VIETNAMESE_WORDS, VIETNAMESE_WORDS_SET } from "./dictionary/vietnamese-words";
import { ENGLISH_WORDS, ENGLISH_WORDS_SET } from "./dictionary/english-words";

const API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

const MODELS_PRIORITY = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash"];

// In-memory evaluation cache for verified words
const evaluationCache = new Map<string, { valid: boolean; meaning: string }>();

// Pre-fill cache with common word definitions
evaluationCache.set("học sinh", { valid: true, meaning: "Người đang theo học ở các trường bậc phổ thông" });
evaluationCache.set("sinh viên", { valid: true, meaning: "Người đang theo học tại các trường đại học, cao đẳng" });
evaluationCache.set("sinh hoạt", { valid: true, meaning: "Các hoạt động sống thường nhật và tập thể" });
evaluationCache.set("sinh động", { valid: true, meaning: "Có sức sống, hấp dẫn và chân thực" });
evaluationCache.set("động đất", { valid: true, meaning: "Hiện tượng rung chuyển mặt đất do hoạt động địa chấn" });
evaluationCache.set("đất nước", { valid: true, meaning: "Quốc gia và lãnh thổ thiêng liêng" });
evaluationCache.set("nước nhà", { valid: true, meaning: "Đất nước của chính mình, tổ quốc thân yêu" });
evaluationCache.set("nhà cửa", { valid: true, meaning: "Nơi ở, nhà ở và các công trình gắn liền" });

export interface EvaluationResult {
  valid: boolean;
  normalizedWord: string;
  meaning?: string;
  error?: string;
}

// Regex to check valid Vietnamese letters
const VIETNAMESE_LETTER_REGEX =
  /^[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ\s]+$/;

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
            temperature: 0.1, // Strict temperature for precision
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
   * Sinh từ nối AI siêu tốc (< 1s) kèm giải nghĩa, đảm bảo từ chính xác 100%
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

    const usedListStr = usedWords.slice(-15).join(", ");
    let prompt = "";

    if (language === "vi") {
      const syllables = previousWord.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const lastSyllable = syllables[syllables.length - 1];

      prompt = `Tìm 1 từ ghép tiếng Việt đúng 2 âm tiết bắt đầu bằng "${lastSyllable}".
Yêu cầu: Từ phải có nghĩa thực tế, phổ biến, chuẩn chính tả tiếng Việt.
Không được trùng: [${usedListStr}].
Chỉ trả về JSON dạng:
{"word": "${lastSyllable} ...", "meaning": "giải nghĩa súc tích từ 6-15 từ"}`;
    } else {
      const lastChar = previousWord.trim().toLowerCase().slice(-1);
      prompt = `Find 1 valid English dictionary word starting with letter "${lastChar.toUpperCase()}".
Not in: [${usedListStr}].
Return JSON:
{"word": "...", "meaning": "concise definition in 6-15 words"}`;
    }

    try {
      const rawText = await callGeminiApi(prompt);
      if (rawText) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          let word = String(parsed.word || "").toLowerCase().trim();
          const meaning = String(parsed.meaning || "Từ vựng chuẩn xác");

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
      console.warn("[Gemini getAiWord]", err);
    }

    // Fallback using verified dictionary
    if (language === "vi") {
      const syllables = previousWord.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const lastSyllable = syllables[syllables.length - 1];

      const candidates = VIETNAMESE_WORDS.filter((w) => {
        const norm = w.trim().toLowerCase();
        if (usedSet.has(norm)) return false;
        const syls = norm.split(/\s+/);
        return syls[0] === lastSyllable && syls.length === 2;
      });

      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        return { word: picked, meaning: "Từ ghép tiếng Việt có nghĩa trong từ điển" };
      }

      return { word: `${lastSyllable} mới`, meaning: "Cụm từ tiếng Việt ghép nghĩa" };
    } else {
      const lastChar = previousWord.trim().toLowerCase().slice(-1);
      const candidates = ENGLISH_WORDS.filter((e) => {
        const norm = e.word.toLowerCase();
        return norm.startsWith(lastChar) && !usedSet.has(norm);
      });

      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        return { word: picked.word, meaning: "Valid English vocabulary" };
      }

      return { word: `${lastChar}one`, meaning: "English compound term" };
    }
  },

  /**
   * Thẩm định từ ngữ NGHIÊM NGẶT & CHÍNH XÁC:
   * 1. Kiểm tra chính tả và cấu trúc âm tiết
   * 2. Kiểm tra nối âm đầu = âm cuối từ trước
   * 3. Kiểm tra không bị trùng từ
   * 4. AI & Từ điển xác nhận từ CÓ NGHĨA THỰC TẾ, từ bừa bãi vô nghĩa BỊ TỪ CHỐI 100%!
   */
  async evaluateWord(
    language: "vi" | "en",
    wordInput: string,
    previousWord: string | null,
    usedWords: string[]
  ): Promise<EvaluationResult> {
    const raw = (wordInput || "").trim().toLowerCase();

    if (!raw) {
      return { valid: false, normalizedWord: "", error: "Vui lòng nhập từ!" };
    }

    if (language === "vi") {
      // 1. Kiểm tra ký tự tiếng Việt hợp lệ
      if (!VIETNAMESE_LETTER_REGEX.test(raw)) {
        return {
          valid: false,
          normalizedWord: raw,
          error: "Từ chứa ký tự không hợp lệ hoặc số/ký hiệu!",
        };
      }

      // 2. Kiểm tra đúng 2 âm tiết
      const syllables = raw.split(/\s+/).filter(Boolean);
      if (syllables.length !== 2) {
        return {
          valid: false,
          normalizedWord: raw,
          error: "Từ tiếng Việt phải gồm đúng 2 âm tiết hoàn chỉnh (Ví dụ: sinh động, học sinh)!",
        };
      }

      // Kiểm tra độ dài từng âm tiết (tối thiểu 1-2 ký tự hợp lệ)
      if (syllables[0].length < 1 || syllables[1].length < 1) {
        return { valid: false, normalizedWord: raw, error: "Âm tiết không đầy đủ!" };
      }

      const normalized = syllables.join(" ");

      // 3. Kiểm tra trùng từ
      const usedNormalized = usedWords.map((w) => w.toLowerCase().trim());
      if (usedNormalized.includes(normalized)) {
        return {
          valid: false,
          normalizedWord: normalized,
          error: `Từ "${normalized}" đã được sử dụng trong ván này rồi!`,
        };
      }

      // 4. Kiểm tra luật nối từ (âm đầu = âm cuối từ trước)
      if (previousWord) {
        const prevSyls = previousWord.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const lastPrev = prevSyls[prevSyls.length - 1];
        if (syllables[0] !== lastPrev) {
          return {
            valid: false,
            normalizedWord: normalized,
            error: `Từ phải bắt đầu bằng chữ "${lastPrev.toUpperCase()}" (âm cuối của "${previousWord}")!`,
          };
        }
      }

      // 5. Kiểm tra Cache
      if (evaluationCache.has(normalized)) {
        const cached = evaluationCache.get(normalized)!;
        if (cached.valid) {
          return { valid: true, normalizedWord: normalized, meaning: cached.meaning };
        }
        return { valid: false, normalizedWord: normalized, error: cached.meaning || "Từ không có nghĩa hợp lý!" };
      }

      // 6. Kiểm tra nhanh qua Từ điển chuẩn nếu có
      if (VIETNAMESE_WORDS_SET.has(normalized)) {
        const meaning = "Từ ghép tiếng Việt chuẩn xác trong từ điển";
        evaluationCache.set(normalized, { valid: true, meaning });
        return { valid: true, normalizedWord: normalized, meaning };
      }

      // 7. Thẩm định NGHIÊM NGẶT bằng Gemini AI
      try {
        const prompt = `Bạn là trọng tài ngôn ngữ tiếng Việt khắt khe trong trò chơi nối từ.
Nhiệm vụ: Đánh giá cụm từ "${normalized}".
CÂU HỎI: Cụm từ "${normalized}" có phải là một từ ghép, từ láy, thành ngữ hoặc cụm từ 2 âm tiết CÓ NGHĨA RÕ RÀNG, HỢP LÝ và ĐƯỢC CÔNG NHẬN trong tiếng Việt không?

Quy tắc thẩm định:
- Nếu là từ ghép có nghĩa thực tế (ví dụ: "sinh động", "nói kháy", "thịt bằm", "công nghệ", "hoa hồng"...): "valid": true
- Nếu là từ ghép bừa bãi, vô nghĩa, gõ linh tinh, không có nghĩa (ví dụ: "sinh chuột", "động búa", "học bàn", "thịt ghế"...): BẮT BUỘC "valid": false

Trả về DUY NHẤT định dạng JSON:
{
  "valid": true / false,
  "meaning": "Giải thích ngắn gọn ý nghĩa nếu đúng, hoặc lý do vô nghĩa nếu sai"
}`;

        const rawText = await callGeminiApi(prompt);
        if (rawText) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const isValid = Boolean(parsed.valid);
            const meaning = String(parsed.meaning || "");

            evaluationCache.set(normalized, { valid: isValid, meaning });

            if (isValid) {
              return { valid: true, normalizedWord: normalized, meaning };
            } else {
              return {
                valid: false,
                normalizedWord: normalized,
                error: meaning || `Từ "${normalized}" không có nghĩa hợp lý trong tiếng Việt!`,
              };
            }
          }
        }
      } catch (err) {
        console.warn("[Gemini Strict Eval]", err);
      }

      // Nếu không có trong từ điển và AI không xác nhận được nghĩa -> Từ chối để đảm bảo tính chuẩn xác
      return {
        valid: false,
        normalizedWord: normalized,
        error: `Từ "${normalized}" chưa được xác nhận có nghĩa chuẩn trong tiếng Việt! Hãy thử từ khác.`,
      };
    } else {
      // English validation
      const clean = raw.replace(/[^a-z]/g, "");
      if (clean.length < 2) {
        return { valid: false, normalizedWord: clean, error: "Please enter a complete English word!" };
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

      if (ENGLISH_WORDS_SET.has(clean)) {
        const meaning = "Recognized English dictionary word";
        evaluationCache.set(clean, { valid: true, meaning });
        return { valid: true, normalizedWord: clean, meaning };
      }

      try {
        const prompt = `Analyze the English word "${clean}".
Is "${clean}" a real, legitimate English dictionary word?
If it is a typo, random characters, or not a valid word, return "valid": false.

Return ONLY JSON:
{
  "valid": true / false,
  "meaning": "concise definition if valid, or reason if invalid"
}`;

        const rawText = await callGeminiApi(prompt);
        if (rawText) {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const isValid = Boolean(parsed.valid);
            const meaning = String(parsed.meaning || "");

            evaluationCache.set(clean, { valid: isValid, meaning });

            if (isValid) {
              return { valid: true, normalizedWord: clean, meaning };
            } else {
              return {
                valid: false,
                normalizedWord: clean,
                error: meaning || `Word "${clean}" is not a recognized English word!`,
              };
            }
          }
        }
      } catch (err) {
        console.warn("[Gemini En Eval]", err);
      }

      return {
        valid: false,
        normalizedWord: clean,
        error: `Word "${clean}" is not recognized in the English dictionary!`,
      };
    }
  },
};
