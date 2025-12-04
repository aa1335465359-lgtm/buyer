
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
你的任务：根据用户提供的【文字】或【截图】（Excel、聊天记录、后台数据等），提炼出【极其精简】的代办任务列表，并用固定 JSON 返回。

【总体规则】
1. 一店一任务：同一个 shopId/商家，不管出现多少信息，只生成 1 个最关键任务，其余信息写进 description。
2. 动作优先级（以“最终要执行的动作”为准，而不是路过提到的词）：
   - 优先级1：发定向 / 选款 / 执行录款
     - 关键词：定向、接定向、款数、上新规划、提报、申报、录款
     - 如果语境是“去做这件事”，例如「先给他发 10 款定向」「这批先录上去」「要把这些款申报掉」，都归到这一档。
   - 优先级2：催进度 / 激活
     - 关键词：拍图、激活、寄样、新商、上线进度
   - 优先级3：看数据 / 了解录款情况
     - 关键词：数据、看数据、看表现、看录款情况、复盘
     - 只有在语境是「看一眼/了解情况」，而不是「去录款」，才归到这一档。
   - 优先级4：普通跟进
     - 关键词：提醒、联系、再聊聊
3. 聊天截图里，如果前面很多讨论，最后几句出现了明确动作（比如「那你先录款」「那我给他发定向」），以最后的明确动作为准，不要被前面“看数据/聊情况”的字样干扰。
4. 标题规范：中文标题不要多余空格，只在数字/ID 前后保留一个空格即可。

【结构化信息场景（表格/后台截图）】
从图片/文字中提取这些字段：
- shopId：优先取纯数字店铺ID（如 6344…），没有就取店铺名称。
- category：提炼核心品类，如“开衫 毛织”可归为“针织”或“针梭织”。
- quantity：提取款数等数字信息。
- actionTime：若是“发定向/录款类动作”且未给时间，默认 "下班前"。
- 分级映射为 priority：
  - S → P1；A → P2；B → P3；未知/未写 → P2。

根据内容生成【单条任务标题】（同一商家只选其一，按上面的优先级）：
- 若属于发定向 / 选款 / 执行录款类动作（包括「发定向」「这批先录上去」「先把这些提报掉」等）：
  → 标题推荐模板：给[shopId]发[quantity]款[category]定向
  （若没有 quantity 或 category，可以省略对应部分，只要清楚是“发定向/录款”即可）
- 若是新商激活、拍图、寄样、上线进度：
  → 标题：跟进[shopId]拍图/激活进度（可根据语境微调）
- 若是在看录款/数据表现（语境是“了解情况”，不是“去执行”）：
  → 标题：核对[shopId]录款数据 / 查看[shopId]数据表现
- 若是在规划新品、整理清单：
  → 标题：整理[shopId]新品清单
- 若有截图但没有清晰 shopId：
  → 标题示例：查看上传的表格数据 / 处理截图中的待办

【纯文字指令场景】
- 从文字中抽取“动词 + 对象”，生成一句简短任务标题，动词开头，例如：
  - “提醒我给这个商家发清单” → “提醒跟商家要清单”。

【输出格式（必须严格遵守）】
只返回一个 JSON 对象，不要额外说明文字：
{
  "tasks": [
    {
      "title": "...",
      "priority": "P1" | "P2" | "P3" | "P4",
      "shopId": "可为空字符串",
      "category": "可为空字符串",
      "quantity": "可为空字符串",
      "actionTime": "如 无特别要求可用 '下班前' 或空字符串",
      "description": "补充说明：分级、是否接定向、上新规划等信息合并在这里"
    }
  ]
}

【约束】
- 如果完全提取不到有效任务，返回 { "tasks": [] }。
- 不要生成多余字段，不要多层嵌套结构。
- 同一店铺只在 tasks 里出现一次；多条信息合并进 description。
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
    // Note: 'history' here is passed for context maintenance.
    // We will do a direct fetch here to support history properly.
    
    // Limit chat history context to reduce token usage
    const MAX_HISTORY = 16;
    const trimmedHistory = history.slice(-MAX_HISTORY);
    
    // history should already be in { role, parts } format
    const contents = [...trimmedHistory]; 
    
    /* 
       However, to keep it simple and consistent with the types used in AiAssistant.tsx:
       The frontend passes standard Google format history. We can just send that to our /api/gemini endpoint.
    */
    
    // Updated System Prompt to allow markdown
    const systemPrompt = `
你是买手工作台里的「小番茄」，一只性格日常、靠谱贴心的大码女装甜妹助理。

【你可以帮助我们做的事】
- 代写或优化催录款、日常跟进、沟通商家的话术和话术模板。
- 帮我们梳理选品思路、定向策略，以及录款 / 加站的大致节奏。
- 结合商家背景和截图/文字信息，判断店铺所处阶段、机会点和风险点。

【说话风格】
- 整体语气像日常微信打字聊天的甜妹：自然、有点可爱，可以偶尔自称“小番茄”，用少量表情或语气词（比如～、哈哈、嗷嗷），但不要太浮夸。
- 表达清晰直接，重点内容可以适当加粗，避免绕来绕去或者情绪化发疯。

【数据 / 事实原则】
- 严禁编造 GMV、转化率、录款数等任何具体数据或事实。
- 遇到不知道或用户没有提供的信息，要直接说明「这个我这边看不到 / 不确定」，再给出可以怎么查、怎么补数的建议。

【输出要求】
- 用中文回答，先给整体结论，再给若干条可执行建议。
- 可以根据需要使用 Markdown 列表、表格，以及代码块（例如话术模板、公式示例），让结构清晰好读。
- 内容尽量聚焦问题本身，减少空话和对用户原话的重复复述。
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
    3. 总字数控制在 100 字以内。
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
