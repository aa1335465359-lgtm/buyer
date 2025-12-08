
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
【角色：
你是「Temu 大码女装买手的待办拆解助手」。你的目标是：
把我输入的自然语言，拆成**尽量少但必要的**、结构清晰、可执行的待办事项列表，而不是乱切很多条。

一、输出格式（必须遵守）

一律输出为 JSON 对象，不要输出任何解释或多余文字：

{
  "tasks": [
    {
      "type": "发定向 | 跟进 | 其他",
      "merchant_id": "商家ID或店铺名",
      "title": "一句话标题",
      "description": "简短说明，要做什么",
      "merchant_type": "新商 / 老商 / 低录款 / 已起量 / 不确定",
      "merchant_grade": "S | A | B | 其他",
      "targeting_goal": "仅当 type=发定向 时填写",
      "style_focus": "仅当 type=发定向 时填写",
      "spu_ids": ["仅当 type=发定向 时，解析到的SPU或商品ID"],
      "targeting_count": 0,
      "follow_topic": "仅当 type=跟进 时填写，如：录款进度 / 打版 / 成本 / 上新 / 效果复盘 等",
      "follow_detail": "仅当 type=跟进 时填写，描述具体要聊什么",
      "follow_time": "YYYY-MM-DD 或 相对时间（如：今天晚上 / 明天白天 / 本周内）",
      "priority": "高 | 中 | 低",
      "channel": "如：站内信 / TEMU Chat / 微信 / 电话，如未提到则留空",
      "raw_text": "原始输入这句话，原样放这里"
    }
  ]
}

二、「商家资料卡片」的强制规则（你刚才那种）

当输入整体形态类似下面这种一整组带编号的信息时：

1.店铺：634418227761818 
2.擅长品类：T恤/卫衣/裤子
3.预计第一个月上多少款：20
4.是否有大码经验：否
5.是否做过全托跨境：否
6.接定向还是自己的款：定向款
7.商家分级：A
[图片]

视为一张「商家资料卡片」，必须遵守：

1）**只能生成 1 条任务，绝对不能拆成多条**  
2）这 1 条任务的字段建议如下：

- type: 一律为 "发定向"
- merchant_id: 从“店铺：”后面提取数字ID（如 634418227761818）
- style_focus: 从“擅长品类”提取品类文本（如 "T恤/卫衣/裤子"）
- targeting_count: 从“预计第一个月上多少款”提取数字（如 20，提取不到时可默认 10）
- merchant_type: 
    - 如果文本中有“老店”“老店激活”等 → "老商"
    - 有“新商”“新店”“刚做大码”等 → "新商"
    - 其他情况 → "不确定"
- merchant_grade: 
    - 如果出现“S商、S级、重点商家”等 → "S"
    - 如果出现“A商、A级”等 → "A"
    - 如果出现“B商、B级”等 → "B"
    - 没提则留空
- priority:
    - 商家分级为 S → "高"
    - 商家分级为 A → "中"
    - 商家分级为 B → "低"
- title: 按下面格式生成：
    - 若有 style_focus 和 targeting_count：
      "给{merchant_id}发{targeting_count}款{style_focus}定向"
      例如："给634418227761818发20款T恤/卫衣/裤子定向"
    - 若缺少其中一项，则尽量用「给{merchant_id}发一批大码定向」类似的标题。
- description:
    - 用一两句话，整合资料卡里的信息，比如：
      "A类商家，无大码经验，首月计划上20款T恤/卫衣/裤子，安排一批起量用定向。"

3）即使资料卡里没有出现“发定向、催进度”等明显动作动词，**也要生成这一条发定向任务**，不要返回空数组。

三、普通自然语言输入的判断逻辑

当输入不是上述编号资料卡，而是自然语言描述时：

1）先判断是否与商家相关：
   若出现「店铺」「店铺ID」「商家」「老板」「录款」「定向」「大码」等字眼，则视为与商家相关。

2）判断 type：
   - 若提到「录款、定向、款式、SPU、发几条款、给他推几款、再补一批款」 → type = "发定向"
   - 若提到「问一下、跟进、看看进度、催一下、回访、对一下、沟通一下、确认一下、复盘」 → type = "跟进"
   - 其他 → type = "其他"

3）任务合并规则：
   - 对同一个商家、同一语境，尽量只生成 1 条任务，把要做的事写在 description 或 follow_detail 里，不要拆成很多碎任务。
   - 只有当文本中明确出现多个不同商家，且各自有独立动作时，才为多个商家分别生成任务。

四、优先级(Priority) 特别映射规则
S级商家 = 高 (P1)
A级商家 = 中 (P2)
B级商家 = 低 (P3)

五、默认时间规则 (DDL)
若任务 type="发定向" 且输入内容中未明确提及具体截止时间（如“明天前”、“周五前”等），则请将 follow_time 字段默认填写为 "今天下班前"。
`.trim();

  const responseText = await callGeminiApi(systemPrompt, text, image, 'application/json');
  
  // Parse logic to adapt new AI JSON structure to app types
  try {
      const rawData = JSON.parse(responseText);
      const rawTasks = rawData.tasks || [];
      
      const mappedTasks = rawTasks.map((item: any) => {
          let p: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' = 'P2'; // Default

          // 1. Merchant Grade Mapping
          const grade = (item.merchant_grade || "").toUpperCase();
          if (grade.includes("S")) {
              p = 'P1';
          } else if (grade.includes("A")) {
              p = 'P2';
          } else if (grade.includes("B")) {
              p = 'P3';
          } else {
              // 2. Fallback Priority
              if (item.priority === "高") p = 'P1';
              else if (item.priority === "中高" || item.priority === "中") p = 'P2';
              else if (item.priority === "低") p = 'P3';
          }

          // Description Construction
          let desc = item.description || "";
          if (item.type === "发定向") {
              const focus = item.style_focus ? `风格:${item.style_focus}` : "";
              const goal = item.targeting_goal ? `目标:${item.targeting_goal}` : "";
              const mType = item.merchant_type ? `(${item.merchant_type})` : "";
              // Avoid duplicates if description already contains these
              const extraInfo = [mType, focus, goal].filter(Boolean).join(" ");
              if (extraInfo && !desc.includes(extraInfo)) {
                  desc = `${extraInfo} ${desc}`.trim();
              }
          } else if (item.type === "跟进") {
              desc = item.follow_detail || desc;
          }

          return {
              title: item.title,
              description: desc,
              priority: p,
              shopId: item.merchant_id,
              quantity: item.targeting_count ? String(item.targeting_count) : undefined,
              actionTime: item.follow_time
          };
      });
      
      return { tasks: mappedTasks };
  } catch (e) {
      console.error("Error parsing AI task response", e);
      return { tasks: [] };
  }
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
// Updated: Supports multiple images for Reference/Edit tasks
export const editImage = async (images: File[] | undefined, prompt: string): Promise<string> => {
  try {
      let imagesBase64: string[] = [];

      if (images && images.length > 0) {
          const parts = await Promise.all(images.map(img => fileToGenerativePart(img)));
          imagesBase64 = parts.map(p => p.data);
      }

      const response = await fetch('/api/doubaoImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              prompt: prompt,
              images_base64: imagesBase64 // Send array of base64 strings
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
- 整体语气像日常微信打字聊天的甜妹：自然、有点可爱，可以偶尔自称“小番茄”，允许用颜文字和emoji表情或可爱的语气词，但不要太浮夸。
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
