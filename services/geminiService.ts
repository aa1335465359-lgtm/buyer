import { GoogleGenAI, Type } from "@google/genai";
import { AITaskResponse, WorkSummary, Todo, Priority } from "../types";
import { SALES_SCRIPTS, ScriptItem } from "../data/scriptLibrary";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Convert file to base64 string
export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper: Parse natural language time to timestamp
const parseDeadline = (timeStr: string | undefined): number | undefined => {
    if (!timeStr) return undefined;
    const lower = timeStr.toLowerCase();
    const now = new Date();
    let target = new Date();

    if (lower.includes('下班') || lower.includes('晚') || lower.includes('before work')) {
        if (lower.includes('明天') || lower.includes('tomorrow')) {
            target.setDate(target.getDate() + 1);
        }
        target.setHours(23, 0, 0, 0);
        return target.getTime();
    }
    if (lower.includes('明天') || lower.includes('tomorrow')) {
        target.setDate(target.getDate() + 1);
        target.setHours(23, 0, 0, 0);
        return target.getTime();
    }
    if (lower.includes('下午') || lower.includes('afternoon')) {
        target.setHours(17, 0, 0, 0);
        return target.getTime();
    }
    if (lower.includes('今天') || lower.includes('today')) {
        target.setHours(23, 0, 0, 0);
        return target.getTime();
    }
    return undefined;
};

// 1. Image & Text Analysis for Task Input
export const analyzeImageAndText = async (text: string, image?: File): Promise<AITaskResponse> => {
  const parts: any[] = [];
  
  if (image) {
      const base64Data = await fileToBase64(image);
      parts.push({ inlineData: { mimeType: image.type, data: base64Data } });
  }
  
  if (text) {
      parts.push({ text: text });
  }

  const systemPrompt = `
【角色设定】
你是「Temu 大码女装买手的待办拆解助手」。
你的任务是将用户的自然语言或截图内容拆解为结构化的 JSON 任务列表。

【最高原则：一铺一单 (One Shop One Task)】
检测到输入中包含几个不同的店铺ID（或明确指代几个不同的商家），JSON 数组中就必须包含几条独立的任务对象。
禁止将多个店铺ID合并在同一条任务里。

【输出 JSON 结构】
{
  "tasks": [
    {
      "type": "发定向 | 跟进 | 其他",
      "merchant_id": "商家ID (数字)",
      "title": "标题",
      "description": "任务说明",
      "merchant_type": "新商/老商/不确定",
      "merchant_grade": "S/A/B",
      "style_focus": "品类/风格",
      "targeting_count": 数字,
      "priority": "高/中/低",
      "follow_time": "YYYY-MM-DD 或 相对时间 (例如：今天下班前)"
    }
  ]
}

【处理模式与规则】
1. type 为 "发定向" 时，title 必须严格按 "给{merchant_id}发{targeting_count}款{style_focus}定向" 生成。
2. type 为 "跟进" 或 "其他" 时，title 简练概括意图。
3. priority: S级=高, A级=中, B级=低。
`;

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: parts },
          config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json'
          }
      });
      
      const rawData = JSON.parse(response.text || '{"tasks": []}');
      const rawTasks = rawData.tasks || [];

      const mappedTasks = rawTasks.map((item: any) => {
          let p: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' = 'P2';
          const grade = (item.merchant_grade || "").toUpperCase();
          
          if (grade.includes("S")) p = 'P1';
          else if (grade.includes("A")) p = 'P2';
          else if (grade.includes("B")) p = 'P3';
          else {
              if (item.priority === "高") p = 'P1';
              else if (item.priority === "中高" || item.priority === "中") p = 'P2';
              else if (item.priority === "低") p = 'P3';
          }

          let desc = item.description || "";
          if (item.type === "发定向" && !desc) {
               desc = `计划发 ${item.targeting_count || "若干"} 款 ${item.style_focus || "大码女装"} 定向。`;
          }

          return {
              title: item.title,
              description: desc,
              priority: p,
              shopId: item.merchant_id,
              quantity: item.targeting_count ? String(item.targeting_count) : undefined,
              actionTime: item.follow_time,
              deadline: parseDeadline(item.follow_time)
          };
      });
      return { tasks: mappedTasks };
  } catch (e) {
      console.error("Error in AI analysis:", e);
      return { tasks: [] };
  }
};

// 2. Script Matcher
export const matchScript = async (input: string, image?: File): Promise<{ analysis: string; recommendations: ScriptItem[] }> => {
  const indexContext = SALES_SCRIPTS.map(s => `ID: ${s.id} | [${s.category}] ${s.scenario}`).join('\n');
  
  // Step 1: Select relevant IDs
  const parts1: any[] = [];
  if (image) {
      const base64Data = await fileToBase64(image);
      parts1.push({ inlineData: { mimeType: image.type, data: base64Data } });
  }
  parts1.push({ text: input || "请分析意图" });

  let selectedIds: string[] = [];
  try {
      const selectionResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: parts1 },
          config: {
              systemInstruction: `你是一个资深大码女装买手。请分析商家发来的话，判断商家的真实意图。从下方的【话术索引】中挑选最合适的 3 个话术 ID。\n索引：\n${indexContext}`,
              responseMimeType: 'application/json'
          }
      });
      const selectionJson = JSON.parse(selectionResponse.text || '{}');
      selectedIds = selectionJson.recommended_ids || [];
  } catch (e) {
      console.error("Selection step failed", e);
  }

  let selectedTemplates = SALES_SCRIPTS.filter(s => selectedIds.includes(s.id));
  if (selectedTemplates.length === 0) {
      selectedTemplates = SALES_SCRIPTS.filter(s => s.category.includes("回复异议")).slice(0, 3);
  }

  // Step 2: Adapt
  const templatesContext = selectedTemplates.map(s => `【模版 ID: ${s.id}】\n分类: ${s.category}\n场景: ${s.scenario}\n原始话术: ${s.content}`).join('\n\n');
  const parts2: any[] = [];
  if (image) {
       const base64Data = await fileToBase64(image);
       parts2.push({ inlineData: { mimeType: image.type, data: base64Data } });
  }
  parts2.push({ text: input || "请根据图片内容生成回复" });

  try {
      const adaptationResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: parts2 },
          config: {
              systemInstruction: `你是一个大码女装买手助理。基于用户实际语境，对参考模版话术进行微调和润色。保持买手"专业、干练、但也贴心"的人设。必须返回 3 个结果。\n参考模版：\n${templatesContext}`,
              responseMimeType: 'application/json'
          }
      });
      
      const adaptationJson = JSON.parse(adaptationResponse.text || '{}');
      const adaptedRecs = adaptationJson.recommendations || [];
      const finalRecs = adaptedRecs.map((rec: any) => {
          const original = SALES_SCRIPTS.find(s => s.id === rec.id);
          return {
              id: rec.id,
              category: original?.category || rec.category,
              scenario: original?.scenario || rec.scenario,
              content: rec.content
          };
      });

      return {
          analysis: adaptationJson.analysis || "AI 分析完成",
          recommendations: finalRecs.length > 0 ? finalRecs : selectedTemplates
      };
  } catch (e) {
      return {
          analysis: "网络抖动，显示原始模版",
          recommendations: selectedTemplates
      };
  }
};

// 3. Image Editor
export const editImage = async (images: File[] | undefined, prompt: string): Promise<string> => {
  try {
      const parts: any[] = [];
      if (images) {
          for (const img of images) {
              const b64 = await fileToBase64(img);
              parts.push({ inlineData: { mimeType: img.type, data: b64 } });
          }
      }
      parts.push({ text: prompt });

      // Use gemini-2.5-flash-image for editing/generating logic
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: parts }
      });

      // Find image part
      if (response.candidates && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
          }
      }
      throw new Error("No image generated");
  } catch (e) {
      console.error(e);
      throw e;
  }
};

// 4. Chat Assistant
export const chatWithBuyerAI = async (history: any[], lastUserMsg: string, images?: File[]): Promise<string> => {
    // Map internal history to SDK Content format
    const contents = history.map((msg: any) => {
        const parts: any[] = [];
        if (msg.images && Array.isArray(msg.images)) {
             msg.images.forEach((imgUrl: string) => {
                 // Assume data URL: data:image/png;base64,.....
                 const match = imgUrl.match(/^data:(.+);base64,(.+)$/);
                 if (match) {
                     parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
                 }
             });
        }
        if (msg.text) {
            parts.push({ text: msg.text });
        }
        return { role: msg.role, parts };
    });

    const systemPrompt = `
你是买手工作台里的「小番茄」，一只性格日常、靠谱贴心的大码女装甜妹助理。
【功能】代写催录款、跟进话术；梳理选品思路；分析店铺机会。
【风格】自然、可爱、允许用emoji。
【要求】尽可能使用 Markdown 表格呈现结构化信息。
`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
            systemInstruction: systemPrompt
        }
    });

    return response.text || "本番茄累了，歇会儿...";
};

// 5. Work Summary
export const generateWorkSummary = async (tasks: Todo[], label: string): Promise<WorkSummary> => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const completionRate = total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
  const overdue = tasks.filter(t => t.status !== 'done' && t.deadline && t.deadline < Date.now()).length;
  const p0Tasks = tasks.filter(t => t.priority === Priority.P0 || (t.priority as string) === 'HIGH');
  const p0Total = p0Tasks.length;
  const p0Completed = p0Tasks.filter(t => t.status === 'done').length;

  const tasksSummary = tasks.map(t => 
    `- [${t.status === 'done' ? '已完成' : '未完成'}] ${t.priority} ${t.title} ${t.deadline && t.deadline < Date.now() ? '[逾期]' : ''}`
  ).join('\n').slice(0, 4000);

  const systemPrompt = `
  你是一位时尚品牌的【买手战略总监】。对工作表现进行深度复盘。
  【数据】：总任务 ${total} (完成 ${completed}), P0 ${p0Total} (完成 ${p0Completed}), 逾期 ${overdue}。
  请输出 JSON (score, overview, achievements, risks, suggestions)。
  `;

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: { parts: [{ text: `请分析：\n${tasksSummary}` }] },
          config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json'
          }
      });
      
      const parsed = JSON.parse(response.text || '{}');
      return {
          rangeLabel: label,
          score: typeof parsed.score === 'number' ? parsed.score : 60,
          overview: parsed.overview || "分析完成。",
          stats: { total, completed, completionRate, overdue, p0Total, p0Completed },
          achievements: parsed.achievements || [],
          risks: parsed.risks || [],
          suggestions: parsed.suggestions || []
      };
  } catch (error) {
      return {
        rangeLabel: label,
        score: 0,
        overview: "数据分析失败",
        stats: { total, completed, completionRate, overdue, p0Total, p0Completed },
        achievements: [],
        risks: [],
        suggestions: []
      };
  }
};

// 6. Daily Report
export const generateDailyReport = async (tasks: Todo[], dateLabel: string): Promise<string> => {
    if (!tasks || tasks.length === 0) return "今天暂无任务记录。";
    const taskDetails = tasks.map(t => `${t.status === 'done' ? '[完成]' : '[未完]'} ${t.priority} ${t.title}`).join('; ');
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `生成今日总结：\n${taskDetails}` }] },
        config: {
            systemInstruction: `你是一个大码买手助理。写一段100字以内的干练总结。日期：${dateLabel}`
        }
    });
    return response.text ? response.text.trim() : "今日数据暂无法分析。";
};