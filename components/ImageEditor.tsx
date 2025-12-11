import React, { useState, useRef, useEffect } from 'react';
import { Upload, Wand2, Download, Image as ImageIcon, Loader2, History, X, Trash2, Clock, Sparkles } from 'lucide-react';
import { editImage } from '../services/geminiService';

interface HistoryItem { id: string; timestamp: number; prompt: string; resultUrl: string; }
const PRESET_PROMPTS = [
    { label: "印花迁移", text: "请将图二服装上的印花图案完整提取，并替换到图一服装表面..." },
    { label: "电商主图 (室内)", text: "将图片中的服装穿在一位欧美大码女装模特身上..." },
    { label: "电商主图 (户外)", text: "将图片中的服装穿在一位欧美大码女装模特身上，户外街景..." },
    { label: "更改面料", text: "请提取【图二】的面料材质，替换到【图一】上..." }
];

const ImageEditor: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<(File | null)[]>([null, null]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([null, null]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => { const saved = localStorage.getItem('image_editor_history'); if(saved) setHistory(JSON.parse(saved)); }, []);
  
  const processFile = (file: File, index: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const newPreviews = [...previewUrls]; newPreviews[index] = e.target?.result as string; setPreviewUrls(newPreviews);
    };
    reader.readAsDataURL(file);
    const newImages = [...selectedImages]; newImages[index] = file; setSelectedImages(newImages);
  };

  const clearImage = (index: number) => {
      const newPreviews = [...previewUrls]; newPreviews[index] = null; setPreviewUrls(newPreviews);
      const newImages = [...selectedImages]; newImages[index] = null; setSelectedImages(newImages);
      if (index === 0 && fileInputRef1.current) fileInputRef1.current.value = '';
      if (index === 1 && fileInputRef2.current) fileInputRef2.current.value = '';
  };

  const handleGenerate = async () => {
    // Enable generation even if no image (Pure text mode)
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const validImages = selectedImages.filter((img): img is File => img !== null);
      const result = await editImage(validImages, prompt);
      setResultUrl(result);
      const newItem = { id: Date.now().toString(), timestamp: Date.now(), prompt, resultUrl: result };
      setHistory(prev => [newItem, ...prev].slice(0, 10));
      localStorage.setItem('image_editor_history', JSON.stringify([newItem, ...history].slice(0, 10)));
    } catch (e) { alert("生成失败，请重试"); } finally { setIsLoading(false); }
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col md:flex-row text-theme-text bg-theme-panel/50">
      {/* History Sidebar */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-theme-panel shadow-theme z-40 transition-transform duration-300 border-l border-theme-border ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-input">
             <h3 className="font-semibold flex items-center gap-2 text-sm"><History size={16} /> 生成历史</h3>
             <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-theme-card rounded text-theme-subtext"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
             {history.map(item => (
                 <div key={item.id} onClick={() => { setResultUrl(item.resultUrl); setPrompt(item.prompt); setShowHistory(false); }} className="group bg-theme-card border border-theme-border hover:border-theme-accent rounded-theme-sm p-2 cursor-pointer shadow-sm flex gap-3">
                    <img src={item.resultUrl} className="w-16 h-16 shrink-0 bg-theme-input rounded-sm object-cover" />
                    <div className="flex-1 flex flex-col min-w-0">
                       <p className="text-xs font-medium text-theme-text line-clamp-2 mb-auto">{item.prompt}</p>
                       <span className="text-[10px] text-theme-subtext flex items-center gap-1 mt-2 opacity-60"><Clock size={10} />{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                 </div>
             ))}
          </div>
       </div>

      <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div><h2 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="text-theme-accent" size={20} /> 改图助手 <span className="text-[10px] font-bold bg-theme-accent-bg text-theme-accent px-1.5 py-0.5 rounded border border-theme-accent/20">BETA</span></h2></div>
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border border-theme-border text-xs font-medium bg-theme-card text-theme-subtext hover:bg-theme-input hover:text-theme-text shadow-sm"><History size={14} />历史记录</button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Left Panel: Inputs */}
          <div className="w-full lg:w-[420px] flex flex-col gap-5 shrink-0">
            {/* Upload Area */}
            <div className="grid grid-cols-2 gap-3">
                {[0, 1].map((index) => (
                    <div key={index} className="relative group aspect-square">
                        <div 
                            onClick={() => !previewUrls[index] && (index === 0 ? fileInputRef1.current?.click() : fileInputRef2.current?.click())} 
                            className={`w-full h-full rounded-theme-lg border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden cursor-pointer
                            ${previewUrls[index] ? 'border-theme-border bg-theme-card' : 'border-theme-border hover:border-theme-accent hover:bg-theme-input/50 bg-theme-input/30'}`}
                        >
                             {previewUrls[index] ? (
                                 <>
                                    <img src={previewUrls[index]!} className="w-full h-full object-cover" />
                                    <button onClick={(e) => { e.stopPropagation(); clearImage(index); }} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"><Trash2 size={14} /></button>
                                 </>
                             ) : (
                                 <div className="text-center p-4">
                                     <div className="w-10 h-10 rounded-full bg-theme-card flex items-center justify-center mx-auto mb-3 shadow-sm text-theme-subtext group-hover:text-theme-accent transition-colors"><Upload size={18} /></div>
                                     <p className="text-sm font-bold text-theme-text mb-1">{index === 0 ? "底图 (主图)" : "参考图"}</p>
                                     <p className="text-[10px] text-theme-subtext">{index === 0 ? "可选" : "可选"}</p>
                                 </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>
            <input type="file" ref={fileInputRef1} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 0)} className="hidden" accept="image/*" />
            <input type="file" ref={fileInputRef2} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 1)} className="hidden" accept="image/*" />

            {/* Prompt Area */}
            <div className="flex flex-col gap-3 flex-1">
                <div className="flex flex-wrap gap-2">
                    {PRESET_PROMPTS.map((preset, i) => (
                        <button key={i} onClick={() => setPrompt(preset.text)} className="px-2.5 py-1 bg-theme-card border border-theme-border rounded-md text-[11px] font-medium text-theme-subtext hover:text-theme-accent hover:border-theme-accent transition-all">
                            {preset.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-theme-card rounded-theme-lg p-1 shadow-sm border border-theme-border flex flex-col min-h-[160px] focus-within:ring-2 focus-within:ring-theme-accent/10 transition-shadow">
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleGenerate();
                            }
                        }}
                        placeholder="描述你的改图需求... (例如：将图二的图案印在图一的衣服上)" 
                        className="w-full h-full bg-transparent border-none outline-none p-4 text-sm text-theme-text placeholder:text-theme-subtext/50 resize-none rounded-theme-lg" 
                    />
                </div>
            </div>
          </div>

          {/* Right Panel: Result & Action */}
          <div className="flex-1 bg-theme-panel/30 backdrop-blur-sm rounded-theme-lg border border-theme-border p-1 flex flex-col relative shadow-inner min-h-[400px]">
             
             {/* Display Area */}
             <div className="flex-1 relative w-full rounded-theme overflow-hidden bg-[url('https://bg-patterns.netlify.app/bg-patterns/transparent.png')] bg-repeat group bg-[length:20px_20px]">
                 {resultUrl ? (
                   <>
                       <img src={resultUrl} className={`w-full h-full object-contain transition-opacity duration-500 ${isLoading ? 'opacity-50 blur-sm scale-95' : 'opacity-100'}`} />
                       {!isLoading && (
                           <a href={resultUrl} download={`edited-${Date.now()}.png`} className="absolute top-4 right-4 bg-white/90 text-black px-4 py-2 rounded-full font-medium text-xs shadow-xl flex items-center gap-2 z-10 hover:scale-105 transition-transform backdrop-blur-sm"><Download size={14} /> 下载图片</a>
                       )}
                   </>
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-theme-subtext opacity-60">
                       <div className={`w-16 h-16 rounded-full bg-theme-input flex items-center justify-center mb-4 transition-all duration-1000 ${isLoading ? 'animate-spin border-4 border-theme-accent border-t-transparent' : ''}`}>
                           {isLoading ? <Loader2 size={32} className="text-theme-accent" /> : <ImageIcon size={32} className="opacity-50" />}
                       </div>
                       <p className="text-sm font-medium">{isLoading ? '正在施法生成中...' : '效果图将在这里显示'}</p>
                   </div>
                 )}
             </div>

             {/* Action Button Area (Right Side Footer) */}
             <div className="p-4 bg-theme-card/80 backdrop-blur-md border-t border-theme-border rounded-b-theme-lg flex justify-center">
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !prompt.trim()} 
                    className={`w-full md:w-auto min-w-[200px] px-8 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl ${
                        isLoading || !prompt.trim()
                        ? 'bg-theme-input text-theme-subtext cursor-not-allowed shadow-none opacity-60' 
                        : 'bg-theme-accent text-white hover:brightness-110 active:scale-95'
                    }`}
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                    {isLoading ? 'AI 正在绘制...' : '立即生成效果图'}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImageEditor;