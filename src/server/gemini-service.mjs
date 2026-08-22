// Server-side Gemini AI Evaluator & Explainer
const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const MODEL = "gemini-flash-lite-latest";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const serverCache = new Map();

export const ServerGeminiService = {
  async evaluateWordWithAi(language, word, previousWord, usedWords) {
    if (language === "vi") {
      const normalized = word.trim().toLowerCase();
      if (serverCache.has(normalized)) return serverCache.get(normalized);

      try {
        const prompt = `Bạn là chuyên gia ngôn ngữ tiếng Việt và là trọng tài công tâm trong trò chơi nối từ.
Nhiệm vụ: Phân tích cụm từ "${normalized}".
Hãy đánh giá xem "${normalized}" có phải là một từ ghép, từ láy hoặc cụm từ 2 âm tiết CÓ NGHĨA, HỢP LÝ, được dùng trong đời sống, văn học, khoa học, khẩu ngữ hay tiếng Việt thực tế không.
Tuyệt đối không rập khuôn danh sách cũ. Hãy chấp nhận mọi từ có nghĩa thực tế.

Trả về duy nhất định dạng JSON sau:
{
  "valid": true,
  "meaning": "giải nghĩa ngắn gọn từ 10-25 từ"
}
Nếu từ hoàn toàn vô nghĩa hoặc không hợp lý:
{
  "valid": false,
  "meaning": "Lý do không hợp lệ"
}`;

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const result = { valid: Boolean(parsed.valid), meaning: String(parsed.meaning || "") };
            serverCache.set(normalized, result);
            return result;
          }
        }
      } catch (err) {
        console.warn("[Server Gemini]", err.message);
      }

      return { valid: true, meaning: "Từ tiếng Việt hợp lệ" };
    } else {
      const clean = word.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (serverCache.has(clean)) return serverCache.get(clean);

      try {
        const prompt = `Analyze the English word "${clean}".
Evaluate whether "${clean}" is a real, valid English word.
Return ONLY JSON:
{
  "valid": true,
  "meaning": "concise definition in 10-20 words"
}
If invalid:
{
  "valid": false,
  "meaning": "Reason why it is invalid"
}`;

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            const result = { valid: Boolean(parsed.valid), meaning: String(parsed.meaning || "") };
            serverCache.set(clean, result);
            return result;
          }
        }
      } catch (err) {
        console.warn("[Server Gemini En]", err.message);
      }

      return { valid: true, meaning: "Valid English word" };
    }
  },
};
