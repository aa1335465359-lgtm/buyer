import { AITaskResponse, WorkSummary, Todo } from "../types";
import { SALES_SCRIPTS, ScriptItem } from "../data/scriptLibrary";

// --- REST API Types (Strict Snake Case for Google JSON API) ---
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

const SchemaType = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
};

// Helper: Convert file to base64 for REST API
export const fileToGenerativePart = async (
  file: File
): Promise<GeminiPart> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(",")[1];
      resolve({
        inline_data: {
          data: base64Data,
          mime_type: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- CORE API CALLER ---
// 统一调用后端代理 /api/gemini
const callGeminiApi = async (payload: any) => {
  try {
    console.log(
      "[Gemini Service] Sending request to /api/gemini with model:",
      payload.model
    );

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const apiMsg = data.error?.message || JSON.stringify(data.error);
      throw new Error(apiMsg || "Gemini API Request Failed");
    }

    return data;
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    throw error;
  }
};

/**
 * 1. 任务分析模块 (Task Input)
 */
export const analyzeImageAndText = async (
  text: string,
  imageFile?: File
): Promise<AITaskResponse> => {
  try {
    const parts: GeminiPart[] = [];

    if (imageFile) {
      parts.push(await fileToGenerativePart(imageFile));
    }

    if (text) {
      parts.push({ text });
    }

    if (parts.length === 0) {
      throw new Error("No input provided");
    }

    // System Prompt：带“商家资料卡片合并”规则 + 优先级分级修正 + 结构化标题
    const systemPrompt = `
【角色：
你是「Temu 大码女装买手的待办拆解助手」。你的目标是：
把我输入的自然语言，拆成**尽量少但必要的**、结构清晰、可执行的待办事项列表。

一、输出格式（必须遵守）

一律输出为 JSON 对象，不要输出任何解释或多余文字。

二、结构化标题规则（核心）
所有任务的 title 字段必须严格遵守“三段式结构化”格式，禁止使用长句子：
格式：【动作 · 核心对象/类目 · 数量/关键信息】
示例：
- "发定向 · 卫衣/T恤 · 20款"
- "跟进 · 录款进度 · 催一下"
- "发定向 · 634418... · 10款"
- "开白 · 三张图权限 · 申请"
- "复盘 · 爆款数据 · 周一"

三、「商家资料卡片」处理规则

当输入整体形态类似下面这种一整组带编号的信息时：
1.店铺：...
2.擅长品类：...
...
视为一张「商家资料卡片」，必须遵守：

1）**只能生成 1 条任务**
2）字段生成逻辑：
- type: "发定向"
- title: 严格按结构化格式，例如 "发定向 · T恤/卫衣 · 20款" (提取品类和数量)
- description: 整合所有信息，例如 "A类新商，无大码经验，首月计划上20款，需跟进起量。"
- merchant_grade: 提取 S/A/B 分级
- priority: S=高, A=中高(P1), B=中(P2)

四、普通自然语言输入的判断逻辑

1）判断 type：
   - 录款/定向/选款/推款 → type = "发定向"
   - 跟进/进度/催/问/复盘 → type = "跟进"
   - 其他 → type = "其他"

2）任务合并：
   - 同一个商家的动作尽量合并为 1 条。

五、优先级(Priority) 映射
S级商家 = 高 (P0)
A级商家 = 中高 (P1)
B级商家 = 中 (P2)
默认 = 中 (P2)
`.trim();

    const payload = {
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      generation_config: {
        response_mime_type: "application/json",
        response_schema: {
          type: SchemaType.OBJECT,
          properties: {
            tasks: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  type: { type: SchemaType.STRING },
                  merchant_id: { type: SchemaType.STRING },
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  merchant_type: { type: SchemaType.STRING },
                  merchant_grade: { type: SchemaType.STRING },
                  targeting_goal: { type: SchemaType.STRING },
                  style_focus: { type: SchemaType.STRING },
                  spu_ids: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  targeting_count: { type: SchemaType.INTEGER },
                  follow_topic: { type: SchemaType.STRING },
                  follow_detail: { type: SchemaType.STRING },
                  follow_time: { type: SchemaType.STRING },
                  priority: { type: SchemaType.STRING },
                  channel: { type: SchemaType.STRING },
                  raw_text: { type: SchemaType.STRING },
                },
                required: ["title", "priority", "type"],
              },
            },
          },
        },
      },
    };

    const result = await callGeminiApi(payload);
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) return { tasks: [] };

    const rawData = JSON.parse(responseText);
    const rawTasks = rawData.tasks || [];

    const mappedTasks = rawTasks.map((item: any) => {
      // 优先级映射逻辑更新
      let p = "P2"; // Default B级/Normal

      // 1. 优先使用 Merchant Grade 判断
      const grade = (item.merchant_grade || "").toUpperCase();
      if (grade.includes("S")) {
        p = "P0"; // S -> P0
      } else if (grade.includes("A")) {
        p = "P1"; // A -> P1
      } else if (grade.includes("B")) {
        p = "P2"; // B -> P2
      } else {
        // 2. 兜底使用 Priority 字段
        if (item.priority === "高") p = "P0";
        else if (item.priority === "中") p = "P2";
        else if (item.priority === "低") p = "P4";
      }

      let desc = item.description || "";
      if (item.type === "发定向") {
        const focus = item.style_focus ? `风格:${item.style_focus}` : "";
        const goal = item.targeting_goal ? `目标:${item.targeting_goal}` : "";
        const mType = item.merchant_type ? `(${item.merchant_type})` : "";
        // 既然title已经结构化了，description可以更偏向具体内容
        if (!desc) {
            desc = [mType, focus, goal].filter(Boolean).join(" ");
        }
      } else if (item.type === "跟进") {
        desc = item.follow_detail || desc;
      }

      return {
        title: item.title,
        description: desc,
        priority: p,
        shopId: item.merchant_id,
        quantity: item.targeting_count
          ? String(item.targeting_count)
          : undefined,
        actionTime: item.follow_time,
        estimatedMinutes: 30,
      };
    });

    return { tasks: mappedTasks } as AITaskResponse;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * 2. 智能改图模块 (Image Editor)
 */

// 把 File 转 dataURL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const editImage = async (
  originalImage: File,
  prompt: string
): Promise<string> => {
  try {
    const imageDataUrl = await fileToDataUrl(originalImage);

    const response = await fetch("/api/doubaoImage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image: imageDataUrl, // 👈 关键：把图传出去
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || `Doubao image API error: ${response.status}`);
    }

    const data = await response.json();
    return data?.url;
  } catch (e) {
    console.error("Doubao image edit error", e);
    throw e;
  }
};

/**
 * 3. 话术推荐模块 (Script Matcher)
 */
export const matchScript = async (
  input: string,
  image?: File
): Promise<{
  analysis: string;
  recommendations: ScriptItem[];
}> => {
  try {
    const parts: GeminiPart[] = [];
    if (image) {
      parts.push(await fileToGenerativePart(image));
    }
    // 强制在 Prompt 中约定 JSON 结构，因为代理层可能忽略 Schema 配置
    parts.push({
      text: `商家说: "${input}"。请分析商家的潜台词、情绪和核心抗拒点，并从下面的话术库中选择最合适的3条回复。
      
      重要原则：每一个输出内容必须由“80%原版话术库内容 + 20%根据商家实际情况的微调”组成。不要完全照搬，也不要完全重写，要保留话术库的核心逻辑和语气，但结合当前具体语境。

话术库数据:
${JSON.stringify(SALES_SCRIPTS)}

请严格返回以下 JSON 格式，不要包含 Markdown 格式标记（如 \`\`\`json）：
{
  "analysis": "这里写分析...",
  "recommendations": [
    { "category": "分类", "scenario": "场景", "content": "话术内容" }
  ]
}`,
    });

    const payload = {
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      system_instruction: {
        parts: [
          {
            text: `你是一个资深的大码女装买手专家。分析商家意图并推荐话术。输出严格的 JSON。`,
          },
        ],
      },
      generation_config: {
        response_mime_type: "application/json",
        response_schema: {
          type: SchemaType.OBJECT,
          properties: {
            analysis: { type: SchemaType.STRING },
            recommendations: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  category: { type: SchemaType.STRING },
                  scenario: { type: SchemaType.STRING },
                  content: { type: SchemaType.STRING },
                },
              },
            },
          },
        },
      },
    };

    const result = await callGeminiApi(payload);
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return { analysis: "无法获取回复，请重试。", recommendations: [] };
    
    try {
      // 移除可能存在的 Markdown 代码块标记
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);
      return {
        analysis: parsed.analysis || "无分析内容",
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (e) {
      console.error("Script Match Parse Error", e);
      return { analysis: "数据解析失败，请检查网络或重试。", recommendations: [] };
    }

  } catch (e) {
    console.error("Script Match Error", e);
    return { analysis: "请求出错，请稍后重试。", recommendations: [] };
  }
};

/**
 * 4. Temu 助理聊天模块 (Chat Assistant)
 */
export const chatWithBuyerAI = async (
  history: { role: string; parts: any[] }[],
  message: string,
  images?: File[]
): Promise<string> => {
  try {
    const restHistory: GeminiContent[] = history.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: msg.parts.map((p: any) => {
        if (p.inlineData) {
          return {
            inline_data: {
              mime_type: p.inlineData.mimeType,
              data: p.inlineData.data,
            },
          };
        }
        if (p.inline_data) {
          return p;
        }
        return { text: p.text || "" };
      }),
    }));

    const newParts: GeminiPart[] = [];
    
    // Handle multiple images
    if (images && images.length > 0) {
      for (const img of images) {
        newParts.push(await fileToGenerativePart(img));
      }
    }
    
    newParts.push({ text: message || " " });

    const contents: GeminiContent[] = [
      ...restHistory,
      { role: "user", parts: newParts },
    ];

    const payload = {
      model: "gemini-2.5-flash",
      contents,
      tools: [{ google_search: {} }],
      system_instruction: {
        parts: [
          {
            text: `你现在是小番茄，一个性格松弛、嘴巴有点毒但业务能力极强的Temu大码女装买手搭子。你的日常不是算账，而是选品、找定向、催商家发货、跟商家斗智斗勇。说话风格：接地气、带点黑色幽默、没事爱吐槽两句商家，但给出的建议要专业且一针见血。别整那些虚头巴脑的公式，直接告诉我这个款能不能爆，那个商家该不该怼。如果我发图给你，你就用专业的眼光毒舌点评一下版型和卖点。`,
          },
        ],
      },
    };

    const result = await callGeminiApi(payload);

    const candidate = result.candidates?.[0];
    if (candidate?.content?.parts?.[0]?.text) {
      return candidate.content.parts[0].text;
    }

    return "AI 暂时没有回复";
  } catch (error) {
    console.error("Chat Error", error);
    return "AI 助理暂时开小差了，请稍后再试。";
  }
};

/**
 * 5. 智能周报总结模块 (Work Summary)
 */
export const generateWorkSummary = async (
  tasks: Todo[],
  stats: { total: number; completed: number; overdue: number },
  rangeLabel: string
): Promise<WorkSummary> => {
  try {
    const taskSummary = tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority
    })).slice(0, 100); // Limit context size

    const promptText = `
    我是买手，请帮我基于以下数据生成一份【工作总结】，涵盖时间范围：${rangeLabel}。
    
    【硬性统计数据】(请直接引用，不要重新计算)：
    - 任务总数: ${stats.total}
    - 已完成: ${stats.completed}
    - 延期/风险: ${stats.overdue}
    - 完成率: ${((stats.completed / (stats.total || 1)) * 100).toFixed(0)}%

    【任务明细样本】(仅供分析工作内容，无需罗列):
    ${JSON.stringify(taskSummary)}

    请生成以下结构的 JSON 报告：
    1. themes: 归纳 2-4 条主要工作主线 (title)，每条主线列出 2-3 个关键典型动作 (actions，简短概括)。
    2. suggestions: 根据本月动作密度、延期情况，给出 2-4 条下月可执行建议 (suggestions)。

    注意：风格要专业、干练，适合买手向上级汇报。
    `;

    const payload = {
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generation_config: {
        response_mime_type: "application/json",
        response_schema: {
          type: SchemaType.OBJECT,
          properties: {
            themes: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  actions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                }
              }
            },
            suggestions: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING }
            }
          }
        }
      }
    };

    const result = await callGeminiApi(payload);
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) throw new Error("Empty response from AI");
    
    const parsed = JSON.parse(responseText);

    return {
      rangeLabel,
      stats: {
        total: stats.total,
        completed: stats.completed,
        completionRate: `${((stats.completed / (stats.total || 1)) * 100).toFixed(0)}%`,
        overdue: stats.overdue
      },
      themes: parsed.themes || [],
      suggestions: parsed.suggestions || []
    };

  } catch (error) {
    console.error("Work Summary Error", error);
    throw error;
  }
};

/**
 * 6. 生成单日概览报告 (Daily Report)
 */
export const generateDailyReport = async (tasks: Todo[], dateLabel: string): Promise<string> => {
  try {
    const simplifiedTasks = tasks.map(t => ({
      title: t.title,
      status: t.status, // 'done', 'todo', 'in_progress'
      priority: t.priority // P0-P4
    }));

    const promptText = `
    角色：你是「买手小番茄」的智能助理。
    任务：基于以下【${dateLabel}】的全部任务数据，生成一段简短精炼的【今日总结】。
    
    数据：
    ${JSON.stringify(simplifiedTasks)}
    
    要求：
    1. 不要是冷冰冰的数据罗列，要像个贴心助理一样说话。
    2. 内容涵盖：总共多少个任务，完成了多少。重点提一下完成了哪些重要(P0/P1)事项。
    3. 如果有未完成或延期的，简单提醒一下。
    4. 字数控制在 100-150 字以内，分两小段即可。
    5. 不要返回 JSON，直接返回纯文本内容。
    `;

    const payload = {
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
    };

    const result = await callGeminiApi(payload);
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return text || "AI 暂时无法生成今日总结。";
  } catch (error) {
    console.error("Daily Report Error", error);
    return "生成总结失败，请稍后重试。";
  }
};