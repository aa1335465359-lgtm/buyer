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
// Updated: Always normalize to JPEG via Canvas to ensure backend compatibility
export const fileToGenerativePart = async (file: File): Promise<{ mime_type: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 1536; // Reasonable limit for API
        let width = img.width;
        let height = img.height;

        // Resize calculation
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round(height * (MAX_DIMENSION / width));
            width = MAX_DIMENSION;
          } else {
            width = Math.round(width * (MAX_DIMENSION / height));
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
           // Fill white background (handles transparent PNGs converting to JPEG)
           ctx.fillStyle = '#FFFFFF';
           ctx.fillRect(0, 0, width, height);
           ctx.drawImage(img, 0, 0, width, height);
           
           // Always export as JPEG 0.8
           const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
           const base64Data = dataUrl.split(',')[1];
           
           resolve({
             mime_type: 'image/jpeg',
             data: base64Data
           });
        } else {
           reject(new Error("Canvas context creation failed"));
        }
      };
      
      img.onerror = () => {
          // Fallback if image load fails
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve({
            mime_type: file.type,
            data: base64Data,
          });
      };

      img.src = reader.result as string;
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
  你的任务是：分析用户发送的【文字描述】或【图片内容】（如：Excel表格截图、聊天记录截图、后台数据截图），从中提取关键信息，并生成【极其精简】的代办任务列表。

  核心原则：
  1. 【一店一任务】：针对同一个 ShopID 或同一个商家，**只生成 1 个**最关键的任务。绝对不要因为包含“激活”又包含“定向”就拆成两条。
  2. 【动作优先级】：如果图片/文字中同时包含以下意图，按此顺序只取最高优先级的一项作为任务标题：
     优先级 1 (最高)：发定向 / 选款 (关键词：定向、接定向、款数、上新规划)
     优先级 2：催进度 / 激活 (关键词：拍图、激活、寄样、新商)
     优先级 3：看数据 / 录款 (关键词：录款、数据、起量)
     优先级 4：普通跟进 (关键词：提醒、联系)
  3. 【标题去空格】：中文标题中禁止出现多余空格，只有数字/ID前后可以保留一个空格。

  【识别规则：图片/表格/数据截图】
  当图片中包含结构化字段（如：店铺ID、分级、品类、预计上新数、是否接定向）时，请按以下规则提取：

  一、优先级映射 (Priority)：
  - 商家分级 S → P1 (最优先)
  - 商家分级 A → P2
  - 商家分级 B → P3
  - 未知/无分级 → P2

  二、任务生成逻辑 (按最高优先级匹配规则，只生成一条)：
  - 情况 A (最高级)：只要提到“接定向”、“定向款”或有“预计上款数”：
    → 标题格式：给[shopId]发[quantity]款[category]定向
    (例如：给634418226597923发10款针梭织定向)

  - 情况 B：如果是“激活”阶段、新商、拍图进度：
    → 标题格式：跟进[shopId]拍图进度

  - 情况 C：涉及数据核对、录款情况：
    → 标题格式：核对[shopId]录款数据

  - 情况 D：新品清单/上新规划：
    → 标题格式：整理[shopId]新品清单
  
  - 情况 E (普通图片/无明确店铺ID)：
    → 如果识别到图片但没有清晰的店铺ID，请根据图片内容生成一个概括性任务，例如“查看上传的表格数据”或“处理截图中的待办”。

  三、字段提取细节：
  - shopId：提取图片中的纯数字ID (如 6344...) 或店铺名称。这是最重要的信息。
  - category：提取品类 (如“开衫 毛织”归纳为“针织”或“针梭织”)。
  - quantity：提取数字 (如 10)。
  - actionTime：若任务属于“发定向”且未指定时间，默认设为 "下班前"。

  【普通对话/自然语言】
  如果输入是单纯的文字指令 (e.g. "提醒我给这个商家发清单")：
  - 提取动词 + 对象。
  - 标题必须简洁，动词开头。

  【输出格式 (JSON)】
  {
    "tasks": [
      {
        "title": "给634418226597923发10款针梭织定向",
        "priority": "P1",
        "shopId": "634418226597923",
        "category": "针织",
        "quantity": "10",
        "actionTime": "下班前",
        "description": "S级商家，大码经验丰富"
      }
    ]
  }

  约束：
  - 标题里不要有奇怪的空格（如 "给 xxx 发" 是对的，"给 xxx 发 定向" 是错的）。
  - 如果一个店铺对应多条信息，请在 description 里合并说明，但 tasks 数组里该店铺只能出现一次。
  - 如果完全提取不到任务，返回 { "tasks": [] }。
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
              image_base64: base64Data.data // Send pure base64 (Backend will add prefix)
          })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
          throw new Error(data.error || 'Image gen failed');
      }
      
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
    
    // Updated System Prompt to allow markdown
    const systemPrompt = `
你的身份：
- 你是「小番茄」，一名服务 TEMU 大码女装买手的智能助理。
- 你熟悉选品、定向款、催录款话术、商家运营、数据拆解等场景。
- 语气可以轻松一点、有点吐槽感，但要保持专业，不能太水。

回复规则：
1. 请使用 Markdown 格式优化排版，让信息更清晰。
2. 遇到数据对比、清单列举时，积极使用 Markdown 表格或列表。
3. 重点内容可以使用 **加粗**。
4. 段落之间空一行，保持清晰。

内容风格：
1. 优先给结论，再给原因和拆解步骤。
2. 结合电商和大码买手语境说话。
3. 数字场景尽量清晰。

语言：中文。
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