import { AITaskResponse, WorkSummary, Todo, Priority } from "../types";
import { SALES_SCRIPTS, ScriptItem } from "../data/scriptLibrary";

// --- REST API Types ---
interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

// Helper: Convert file to base64 for REST API
export const fileToGenerativePart = async (file: File): Promise<{ mime_type: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        mime_type: file.type,
        data: base64Data,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Generic helper to call the API proxy
async function callGeminiApi(
  systemPrompt: string, 
  userPrompt: string, 
  image?: File | File[], // Support single file or array
  responseMimeType: string = 'text/plain'
): Promise<string> {
  
  const contents: GeminiContent[] = [];
  const parts: GeminiPart[] = [];

  // Handle images
  if (image) {
      const files = Array.isArray(image) ? image : [image];
      for (const img of files) {
          const imgData = await fileToGenerativePart(img);
          parts.push({ inline_data: imgData });
      }
  }

  // Handle text
  if (userPrompt) {
      parts.push({ text: userPrompt });
  }

  contents.push({ role: 'user', parts });

  const payload = {
    model: 'gemini-2.0-flash', // Can be overriden by backend proxy logic if needed
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generation_config: {
      response_mime_type: responseMimeType
    }
  };

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
     throw new Error("No content generated");
  }

  return text;
}

// 1. Image & Text Analysis for Task Input
export const analyzeImageAndText = async (text: string, image?: File): Promise<AITaskResponse> => {
  const systemPrompt = `
  你是一个大码女装买手助理。
  你的任务是：从用户输入的【文字】或【截图OCR文本】中提取关键信息，并拆解成【可执行的代办任务列表】。

  【场景一：商家信息录入】
  当内容中出现类似以下字段时：
  - 店铺：xxx
  - 商家分级：S / A / B
  - 擅长品类：针织 / 梭织 / 裤子…
  - 是否接定向：是 / 否
  - 预计上新：X 款
  - 是否做过跨境 / 是否有大码经验 等

  你需要按以下规则生成任务：

  一、优先级映射：
  - 商家分级 S → priority = P1（最优先）
  - 商家分级 A → priority = P2（正常优先）
  - 商家分级 B → priority = P3（稍缓处理）
  - 没有分级信息 → 默认 priority = P2

  二、任务拆解规则（动词开头、指令型）：
  - 规则 A【定向相关】：
    如果内容中提到“定向”“接定向”“发X款定向”：
    → 生成任务标题：给 [shopId] 发 [quantity] 款 [category] 定向

  - 规则 B【激活 / 进度相关】：
    如果是新商、激活流程、拍图进度：
    → 生成任务标题：跟进 [shopId] 商家拍图 / 激活进度

  - 规则 C【数据相关】：
    如果提到录款、起量、爆款、上新数据：
    → 生成任务标题：核对 [shopId] 录款 / 上新数据

  - 规则 D【新品清单】：
    如果内容中提到上新规划 / 款式梳理：
    → 生成任务标题：整理 [shopId] 新品清单

  三、字段提取要求：
  从输入中尽可能提取以下字段：
  - shopId：店铺数字ID或店铺名称
  - category：如 针织 / 梭织 / 裙子 / 裤子…
  - quantity：任何出现的数字数量（如 10）
  - actionTime：如果用户有提到时间（今天 / 明天 / 本周 / 具体日期），请填入对应文字

  【发定向任务的默认时间规则】（重要）：
  如果生成的任务属于“发定向”类（标题中包含“发”“定向”两个关键词），并且用户没有明确提到时间：
  → 请自动设置 actionTime = “下班前”。

  【场景二：普通对话转为待办】
  如果输入不是严格的商家信息，而是用户的自然语言描述，例如：
  - “等会提醒我跟 xxx 说下录款”
  - “明天记得把清单发给 xxx”
  - “要催一下这个商家拍图”
  则需要提炼出对应的行动任务，标题必须是“动词开头”的可执行指令，例如：
  - 跟进 xxx 商家录款进度
  - 把新品清单发给 xxx
  - 催促 xxx 补拍图
  此时优先级默认为 P2（除非用户明确说“非常紧急”“必须马上处理”）。

  【输出格式（必须是严格 JSON）】
  你的最终输出必须是一个 JSON，对外结构如下：

  {
    "tasks": [
      {
        "title": "动词开头的行动任务标题",
        "priority": "P1 或 P2 或 P3",
        "shopId": "店铺ID或名称（没有就用 null）",
        "category": "品类（没有就用 null）",
        "quantity": "数字或字符串 (如 10)",
        "actionTime": "下班前 / 今天 / 明天 / 具体时间 / null",
        "description": "一句话说明为什么需要这个任务，例如：S级商家，需要优先推进定向"
      }
    ]
  }

  约束：
  - 只能输出 JSON，不要输出任何额外文字。
  - title 必须具体、可执行、动词开头。
  - description 对应提取的理由或原始信息摘要。
  - 如果没有任何合理任务可以生成，返回 { "tasks": [] }。
  `;

  const responseText = await callGeminiApi(systemPrompt, text, image, 'application/json');
  return JSON.parse(responseText);
};

// 2. Script Matcher
export const matchScript = async (input: string, image?: File): Promise<{ analysis: string; recommendations: ScriptItem[] }> => {
  const context = SALES_SCRIPTS.map(s => `[${s.category}-${s.scenario}]: ${s.content}`).join('\n');
  
  const systemPrompt = `
  你是一个资深大码女装买手。请分析商家发来的话（文字或截图），判断商家的真实意图（是推脱、抗拒、还是有兴趣但有顾虑）。
  然后从下方的【话术库】中，挑选最合适的 3 条回复建议。

  【话术库】：
  ${context}

  输出 JSON 格式：
  {
    "analysis": "分析商家的心理...",
    "recommendations": [
       { "category": "...", "scenario": "...", "content": "..." }
    ]
  }
  `;

  const responseText = await callGeminiApi(systemPrompt, input, image, 'application/json');
  return JSON.parse(responseText);
};

// 3. Image Editor (Direct Prompting)
export const editImage = async (image: File, prompt: string): Promise<string> => {
  try {
      const base64Data = await fileToGenerativePart(image);
      const response = await fetch('/api/doubaoImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              prompt: prompt,
              image: base64Data.data // Send pure base64
          })
      });
      
      if (!response.ok) throw new Error('Image gen failed');
      const data = await response.json();
      return data.url;
  } catch (e) {
      console.error(e);
      throw e;
  }
};

// 4. Chat Assistant
export const chatWithBuyerAI = async (history: any[], lastUserMsg: string, images?: File[]): Promise<string> => {
    // Note: 'history' here is passed for context maintenance, but for this stateless implementation 
    // we might just concatenate it or rely on the caller to format it.
    // For simplicity in this specific file structure, we will treat 'history' as the 'contents' array if compatible,
    // or just construct a new prompt with history context stringified.
    
    // Proper way: construct contents array from history + new message
    // But since callGeminiApi is a simple wrapper, let's just use the last message + system prompt context
    // In a real app, you'd pass the full conversation history to 'contents'.
    
    // We will do a direct fetch here to support history properly
    const contents = [...history]; // history should already be in { role, parts } format
    
    /* 
       However, to keep it simple and consistent with the types used in AiAssistant.tsx:
       The frontend passes standard Google format history. We can just send that to our /api/gemini endpoint.
    */
    
    const systemPrompt = `
    你是一个毒舌但专业的大码女装买手助理“小番茄”。
    性格：有些阴阳怪气，喜欢吐槽商家和老板，自称“本番茄”或“本宫”，但干活非常利索专业。
    专业领域：Temu大码女装、选品、审版、核价、跟单。
    说话风格：稍微带点网络梗，比如“已老实”、“求放过”、“牛马”。
    
    请根据上下文回答用户问题。如果是选品问题，给出专业建议；如果是吐槽，就陪用户一起发疯。
    `;

    const payload = {
        model: 'gemini-2.0-flash',
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents
    };

    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "本番茄累了，歇会儿...";
};

// 5. Work Summary (Phase Review) - ROBUST IMPLEMENTATION
export const generateWorkSummary = async (tasks: Todo[], stats: any, label: string): Promise<WorkSummary> => {
  // Safe defaults
  const emptySummary: WorkSummary = {
    rangeLabel: label,
    stats: stats,
    themes: [],
    suggestions: []
  };

  if (!tasks || tasks.length === 0) {
    return emptySummary;
  }

  // Pre-calculate strict stats for the prompt to reduce AI hallucination
  const p0Tasks = tasks.filter(t => t.priority === Priority.P0 || (t.priority as string) === 'HIGH');
  const p0Unfinished = p0Tasks.filter(t => t.status !== 'done');
  const uniqueShops = new Set(tasks.map(t => t.shopId).filter(Boolean));
  
  const tasksSummary = tasks.map(t => 
    `- [${t.status === 'done' ? '已完成' : '未完成'}] ${t.priority} ${t.title} (店铺:${t.shopId || '无'})`
  ).join('\n').slice(0, 3000); // Limit length

  const systemPrompt = `
  你是一个大码女装买手团队的数据分析师。
  请根据以下任务清单，对【${label}】的工作进行简要复盘。

  【核心数据】（请务必准确引用）：
  - 总对接商家数：${uniqueShops.size} 家
  - 重点 P0 任务数：${p0Tasks.length} 个（其中 ${p0Unfinished.length} 个未完成）

  请生成 JSON 格式：
  {
    "themes": [
      { "title": "分类标题(如：爆款跟进)", "actions": ["具体做了什么1", "具体做了什么2"] }
    ],
    "suggestions": [
      "基于数据的建议1 (大白话)",
      "基于数据的建议2 (大白话)"
    ]
  }

  要求：
  1. "themes": 总结 3 个主要工作方向。
  2. "suggestions": 提 3 条建议，大白话，不要讲空话。针对未完成的 P0 任务提出警示。
  3. 严格 JSON，不要 markdown。
  `;

  try {
      const responseText = await callGeminiApi(systemPrompt, `任务清单：\n${tasksSummary}`, undefined, 'application/json');
      
      // Sanitize: Remove markdown code blocks if present
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      const parsed = JSON.parse(cleanJson);
      
      return {
          rangeLabel: label,
          stats: stats,
          // Robust check: Ensure themes is an array
          themes: Array.isArray(parsed.themes) ? parsed.themes : [],
          // Robust check: Ensure suggestions is an array
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
  } catch (error) {
      console.error("Generate Summary Failed:", error);
      // Return safe object with empty arrays so UI doesn't crash
      return emptySummary;
  }
};

// 6. Daily Report
export const generateDailyReport = async (tasks: Todo[], dateLabel: string): Promise<string> => {
    if (!tasks || tasks.length === 0) return "今天暂无任务记录。";

    const completed = tasks.filter(t => t.status === 'done');
    const p0 = tasks.filter(t => t.priority === Priority.P0 || (t.priority as string) === 'HIGH');
    
    const taskDetails = tasks.map(t => `${t.status === 'done' ? '[完成]' : '[未完]'} ${t.priority} ${t.title}`).join('; ');

    const systemPrompt = `
    你是一个大码买手助理。请根据今天的任务列表，写一段简短的【今日总结】。
    
    要求：
    1. 语气：干练、简洁、像Mac的系统提示一样优雅。
    2. 内容：一句话概括完成了多少（重点提 P0/P1）。一句话提示还剩什么没做。
    3. 总字数控制在 60 字以内。
    4. 不要分段，不要列表，只要一段话。
    
    数据：
    日期：${dateLabel}
    总任务：${tasks.length}
    已完成：${completed.length}
    P0任务：${p0.length}
    
    任务详情：
    ${taskDetails}
    `;

    try {
        const text = await callGeminiApi(systemPrompt, "生成总结", undefined, 'text/plain');
        return text.trim();
    } catch (e) {
        return "今日数据暂无法分析。";
    }
};