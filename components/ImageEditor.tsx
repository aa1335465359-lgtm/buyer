
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Wand2, Download, Image as ImageIcon, Loader2, RefreshCw, History, X, Trash2, Clock, Sparkles } from 'lucide-react';
import { editImage } from '../services/geminiService';

interface HistoryItem {
  id: string;
  timestamp: number;
  prompt: string;
  resultUrl: string; // Base64
}

// Updated Presets: Cleaner labels, specific scenarios
const PRESET_PROMPTS = [
    {
        label: "印花迁移",
        text: `请将图二服装上的印花图案完整提取，并替换到图一服装表面。
要求：
1. 不改变图一的款式、版型、结构、领形、褶皱与光影；
2. 仅更换印花，其他内容全部保持图一原样；
3. 印花需严格保持图二的原始密度、大小、间距、排布方向与重复规律；
4. 印花贴合图一的布料纹理与褶皱，实现自然透视与弯折效果；
5. 最终效果需像“原本就属于图一的印花”，无明显贴图痕迹。`
    },
    {
        label: "电商主图 (室内影棚)",
        text: `将图片中的服装穿在一位欧美大码女装模特身上。
要求：
1. 模特设定：典型的欧美面孔，微胖身材（Curvy / Size XL），体态匀称不臃肿，妆容精致，自信微笑；
2. 背景环境：极简的高级室内摄影棚（米色或浅灰纯色背景），搭配少许几何道具；
3. 摄影参数：使用极小光圈（f/16）拍摄，拒绝背景虚化，追求全景深（Deep Depth of Field），确保从模特到背景的所有细节都清晰锐利；
4. 灯光质感：柔和漫反射影棚光，展现服装的高级质感。`
    },
    {
        label: "电商主图 (户外街景)",
        text: `将图片中的服装穿在一位欧美大码女装模特身上。
要求：
1. 模特设定：欧美面孔，微胖身材（Curvy / Size XL），体态匀称，时尚街拍风格，松弛感；
2. 背景环境：阳光明媚的午后，干净的高端街区或现代建筑旁；
3. 摄影参数：使用小光圈（f/11）拍摄，不要景深虚化，保持背景清晰可见，实现人景合一的通透感；
4. 画面风格：模拟自然阳光，色彩真实，清晰度高。`
    },
    {
        label: "更改面料 (参考图二)",
        text: `请提取【图二】的面料材质、纹理和光泽感，完美替换到【图一】的服装上。
要求：
1. 严格保持【图一】服装原有的版型、轮廓、褶皱走向和光影结构完全不变；
2. 仅替换材质属性（如：若是图二是粗花呢，则让图一呈现粗花呢的编织感；若是真丝，则呈现真丝的光泽）；
3. 确保图二的纹理大小符合图一的透视比例；
4. 视觉上自然融合，像原本就是用图二这种面料制成的成衣。`
    }
];

const ImageEditor: React.FC = () => {
  // Supports up to 2 images
  const [selectedImages, setSelectedImages] = useState<(File | null)[]>([null, null]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([null, null]);
  
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState<number | null>(null); // Index of drag target
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('image_editor_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (item: HistoryItem) => {
    try {
      const newHistory = [item, ...history].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('image_editor_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error("Storage full, cannot save history", error);
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('image_editor_history', JSON.stringify(newHistory));
  };

  const restoreFromHistory = (item: HistoryItem) => {
      setResultUrl(item.resultUrl);
      setPrompt(item.prompt);
      setShowHistory(false);
  };

  const processFile = (file: File, index: number) => {
    if (!file.type.startsWith('image/')) {
        alert("请上传图片文件 (JPG, PNG)");
        return;
    }
    
    const newImages = [...selectedImages];
    newImages[index] = file;
    setSelectedImages(newImages);

    const reader = new FileReader();
    reader.onload = (e) => {
        const newPreviews = [...previewUrls];
        newPreviews[index] = e.target?.result as string;
        setPreviewUrls(newPreviews);
    };
    reader.readAsDataURL(file);
    setResultUrl(null); // Reset result on new input
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], index);
    }
  };

  const clearImage = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const newImages = [...selectedImages];
      newImages[index] = null;
      setSelectedImages(newImages);
      
      const newPreviews = [...previewUrls];
      newPreviews[index] = null;
      setPreviewUrls(newPreviews);
      
      // Reset file input value so same file can be selected again
      if (index === 0 && fileInputRef1.current) fileInputRef1.current.value = '';
      if (index === 1 && fileInputRef2.current) fileInputRef2.current.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Filter out nulls to get actual files
    const validImages = selectedImages.filter((img): img is File => img !== null);
    
    setIsLoading(true);
    try {
      const result = await editImage(validImages, prompt);
      setResultUrl(result);
      
      saveToHistory({
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt: prompt,
        resultUrl: result
      });

    } catch (error) {
      alert("生成失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (url?: string) => {
    const targetUrl = url || resultUrl;
    if (!targetUrl) return;
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = `buyermate-edited-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col md:flex-row">
      
      {/* History Sidebar */}
      <div 
         className={`
           absolute top-0 right-0 h-full w-80 bg-white shadow-2xl z-30 transition-transform duration-300 transform flex flex-col border-l border-slate-200
           ${showHistory ? 'translate-x-0' : 'translate-x-full'}
         `}
       >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
             <h3 className="font-semibold text-purple-900 flex items-center gap-2">
               <History size={18} /> 生成历史
             </h3>
             <button 
               onClick={() => setShowHistory(false)}
               className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
             >
               <X size={18} />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
             {history.length === 0 ? (
               <div className="text-center py-10 text-slate-400 text-sm">
                 暂无生成记录
               </div>
             ) : (
               history.map(item => (
                 <div 
                   key={item.id}
                   onClick={() => restoreFromHistory(item)}
                   className="group bg-white border border-slate-200 hover:border-purple-300 rounded-xl p-2 cursor-pointer transition-all shadow-sm hover:shadow-md flex gap-3"
                 >
                    <div className="w-20 h-20 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-100">
                       <img src={item.resultUrl} alt="History thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0 py-0.5">
                       <p className="text-xs font-medium text-slate-800 line-clamp-2 mb-auto" title={item.prompt}>
                         {item.prompt}
                       </p>
                       <div className="flex items-center justify-between mt-2">
                         <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(item.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </span>
                         <button 
                           onClick={(e) => deleteHistoryItem(e, item.id)}
                           className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                         >
                           <Trash2 size={12} />
                         </button>
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>
       </div>

      <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
              <Wand2 className="text-purple-600" />
              小番茄改图助手 <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Pro 4.5</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">支持双图参考、印花迁移、文生图。无需上传图片即可直接输入描述生成。</p>
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-xl transition-all border text-sm font-medium
              ${showHistory 
                ? 'bg-purple-100 text-purple-700 border-purple-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }
            `}
          >
            <History size={18} />
            <span className="hidden sm:inline">历史</span>
          </button>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Left: Input Area */}
          <div className="w-full lg:w-[450px] flex flex-col gap-4 shrink-0">
            
            {/* Image Uploaders (2 Slots) */}
            <div className="grid grid-cols-2 gap-4 h-48">
                {[0, 1].map((index) => (
                    <div 
                        key={index}
                        onClick={() => index === 0 ? fileInputRef1.current?.click() : fileInputRef2.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(index); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(null); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(null);
                            if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0], index);
                        }}
                        className={`
                            relative rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group
                            ${isDragging === index ? 'border-purple-500 bg-purple-50' : ''}
                            ${!previewUrls[index] ? 'border-slate-300 hover:border-purple-400 bg-white/50 hover:bg-white/80' : 'border-transparent bg-slate-100'}
                        `}
                    >
                        {previewUrls[index] ? (
                            <>
                                <img src={previewUrls[index]!} alt={`Upload ${index + 1}`} className="w-full h-full object-contain p-2" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <p className="text-white font-medium text-xs flex items-center gap-1">
                                        <RefreshCw size={12} /> 更换
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => clearImage(index, e)}
                                    className="absolute top-2 right-2 bg-slate-800/80 text-white p-1 rounded-full hover:bg-red-500 transition-colors z-10"
                                >
                                    <X size={12} />
                                </button>
                                <span className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    {index === 0 ? "图一 (底图)" : "图二 (参考)"}
                                </span>
                            </>
                        ) : (
                            <div className="text-center p-2 pointer-events-none">
                                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Upload size={16} />
                                </div>
                                <p className="text-xs font-bold text-slate-600">
                                    {index === 0 ? "上传图一" : "上传图二"}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {index === 0 ? "底图/主体" : "素材/参考"}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <input type="file" ref={fileInputRef1} onChange={(e) => handleFileSelect(e, 0)} className="hidden" accept="image/*" />
            <input type="file" ref={fileInputRef2} onChange={(e) => handleFileSelect(e, 1)} className="hidden" accept="image/*" />

            {/* Presets - Simplified UI */}
            <div className="flex flex-wrap gap-2 py-1">
                {PRESET_PROMPTS.map((preset, i) => (
                    <button
                        key={i}
                        onClick={() => setPrompt(preset.text)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all shadow-sm"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Prompt Input */}
            <div className="flex-1 bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/50 flex flex-col gap-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">修改/生成指令</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="在此描述你的需求。例如：把图二的印花印到图一上..."
                className="w-full h-32 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className={`
                  w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all
                  ${isLoading || !prompt.trim()
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200 hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                {isLoading ? 'AI 正在绘制中...' : '开始生成'}
              </button>
            </div>
          </div>

          {/* Right: Result */}
          <div className="flex-1 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/40 p-1 flex flex-col relative shadow-inner min-h-[400px]">
             {resultUrl ? (
               <div className="relative w-full h-full rounded-xl overflow-hidden bg-[url('https://bg-patterns.netlify.app/bg-patterns/transparent.png')] bg-repeat group">
                  <img src={resultUrl} alt="Result" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => handleDownload()}
                    className="absolute bottom-6 right-6 bg-white text-slate-900 px-5 py-2.5 rounded-full font-medium text-sm shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 z-10"
                  >
                    <Download size={16} /> 下载原图
                  </button>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                 <div className="w-20 h-20 rounded-3xl bg-slate-100/50 flex items-center justify-center mb-4 border border-dashed border-slate-200">
                   <ImageIcon size={32} className="opacity-20" />
                 </div>
                 <p className="text-sm font-medium">效果图将在这里显示</p>
                 <p className="text-xs opacity-60 mt-1">支持纯文本生成，或基于1-2张参考图生成</p>
               </div>
             )}
             
             {isLoading && (
               <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                 <div className="flex flex-col items-center gap-3">
                   <Loader2 size={32} className="text-purple-600 animate-spin" />
                   <span className="text-sm font-medium text-slate-600">AI 正在疯狂计算中...</span>
                 </div>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
