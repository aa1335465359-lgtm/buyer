
import { AIAction, MemoryResult } from "../types";

export const callAIToGenerateMemory = async (content: string): Promise<MemoryResult | null> => {
  if (!content || content.trim().length === 0) return null;

  const messages = [
    {
      role: "system",
      content: `你是一个极具洞察力和诗意的日记印记提取专家。请深入细腻地阅读用户的日记，不仅提取字面意思，还要捕捉文字背后的情绪张力（可能很复杂，比如失落中带着希望），然后生成极具个性的回忆印记。
必须严格输出合法的 JSON 对象，绝对不要包含任何 \`\`\`json 标签。
要求：拒绝平庸，不要总是生成一样的话。
结构如下：
{
  "mood": "精准的情感词（不仅是高兴/难过，用如：泥沼中的挣扎, 释怀的瞬间, 疲惫但笃定）字数不限尽量生动短促",
  "keywords": ["直击灵魂的关键词1", "诗意意象2", "深刻的短语3"],
  "stampText": "一句3-8字的私人落款（如：在风中停驻, 想念一片海, 依然勇敢）",
  "quote": "根据日记内容，为用户写一句深深共鸣、有文学美感、甚至带有哲思的话。不要说教套话，要像诗人一样总结。不超过30个字。",
  "colorTheme": "从以下鲜明的主题中选一个最符合日记心境的：[sunset, ocean, matcha, lavender, peach, stone, abyssal, warm_ember, frost, gold]",
  "shapeStyle": "从 [organic, geometric, minimal] 中选一个"
}`
    },
    { role: "user", content }
  ];

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature: 0.95,
        max_tokens: 350
      })
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("API Response is not JSON:", rawText.slice(0, 100));
      return null;
    }

    if (!response.ok) {
      console.error("AI API Backend Error:", data);
      return null;
    }

    let resultText = data.choices?.[0]?.message?.content || "";
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(resultText);
      return {
        mood: parsed.mood || "流淌的记录",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 3) : [],
        stampText: parsed.stampText || "某年某月",
        quote: parsed.quote || "这是平凡的一页，也是独特的一天。",
        colorTheme: ["sunset", "ocean", "matcha", "lavender", "peach", "stone", "abyssal", "warm_ember", "frost", "gold"].includes(parsed.colorTheme) ? parsed.colorTheme : "stone",
        shapeStyle: ["organic", "geometric", "minimal"].includes(parsed.shapeStyle) ? parsed.shapeStyle : "organic"
      };
    } catch (parseError) {
      console.error("Failed to parse inner JSON", resultText);
      return null;
    }

  } catch (error) {
    console.error("Memory Generation Failed:", error);
    return null;
  }
};

export const callAI = async (
  content: string,
  action: AIAction
): Promise<string> => {
  if (!content || content.trim().length === 0) return '';

  let messages = [];
  let temperature = 0.7;
  let max_tokens = 500;

  // 根据不同动作构建 Prompt
  switch (action) {
    case AIAction.SUMMARIZE:
      messages = [
        { role: "system", content: "你是一位文字极简主义者。请用极其精炼的中文总结这段日记的核心内容，像写日记标题一样，不超过 30 个字。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.REFLECT:
      messages = [
        { role: "system", content: "你是一位温暖的心理咨询师。请分析这段文字背后的情绪基调，并给出简短、温暖的洞察或鼓励。不要说教。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.POETRY:
      messages = [
        { role: "system", content: "你是一位现代派诗人。请捕捉这段文字的意境，创作一首现代三行诗。风格要细腻、有画面感。" },
        { role: "user", content: `日记内容：\n${content}` }
      ];
      break;
    case AIAction.PREDICT:
      temperature = 0.6; // 稍微增加创造性
      max_tokens = 60;   
      messages = [
        { 
          role: "system", 
          content: `你就是用户本人（Inner Voice）。请顺着上文的语境、语气和情绪，自然地续写下一句话。
          
要求：
1. 风格完全模仿上文（如果是口语就用口语，文艺就文艺）。
2. 逻辑连贯，不要重复上文已有的词。
3. 不要输出任何解释，直接输出续写内容。
4. 长度控制在 10-20 字左右，点到为止。` 
        },
        { role: "user", content: content } // 传入足够多的上文以供模仿
      ];
      break;
  }

  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens
      })
    });

    // 读取原始文本，防止 JSON.parse 崩溃
    const rawText = await response.text();

    // 尝试解析 JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      // 如果解析失败，说明返回的不是 JSON (可能是 404 页面的 HTML，或者 500 报错)
      console.error("API Response is not JSON:", rawText.slice(0, 100));
      throw new Error(`请求异常 (${response.status}): ${rawText.slice(0, 50)}...`);
    }

    if (!response.ok) {
      console.error("AI API Backend Error:", data);
      const errorMsg = data.error?.message || data.error || "未知错误";
      throw new Error(`API错误: ${errorMsg}`);
    }

    const resultText = data.choices?.[0]?.message?.content || "";
    return resultText.trim().replace(/^['"]|['"]$/g, '');

  } catch (error: any) {
    console.error("AI Request Failed:", error);
    
    // 预测模式静默失败，不弹窗
    if (action === AIAction.PREDICT) return "";

    // 静默失败，返回空字符串让前端不展示错误块
    return "";
  }
};
