
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Wand2, Download, Image as ImageIcon, Loader2, RefreshCw, History, X, Trash2, Clock } from 'lucide-react';
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
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const validImages = selectedImages.filter((img): img is File => img !== null);
      const result = await editImage(validImages, prompt);
      setResultUrl(result);
      const newItem = { id: Date.now().toString(), timestamp: Date.now(), prompt, resultUrl: result };
      setHistory(prev => [newItem, ...prev].slice(0, 5));
      localStorage.setItem('image_editor_history', JSON.stringify([newItem, ...history].slice(0, 5)));
    } catch (e) { alert("生成失败"); } finally { setIsLoading(false); }
  };

  return (
    <div className="h-full relative overflow-hidden flex flex-col md:flex-row text-theme-text">
      {/* History Sidebar */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-theme-panel shadow-theme z-30 transition-transform duration-300 border-l border-theme-border ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-input">
             <h3 className="font-semibold flex items-center gap-2"><History size={18} /> 生成历史</h3>
             <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-theme-card rounded text-theme-subtext"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
             {history.map(item => (
                 <div key={item.id} onClick={() => { setResultUrl(item.resultUrl); setPrompt(item.prompt); setShowHistory(false); }} className="group bg-theme-card border border-theme-border hover:border-theme-accent rounded-theme-sm p-2 cursor-pointer shadow-sm flex gap-3">
                    <img src={item.resultUrl} className="w-20 h-20 shrink-0 bg-theme-input rounded-sm object-cover" />
                    <div className="flex-1 flex flex-col min-w-0">
                       <p className="text-xs font-medium text-theme-text line-clamp-2 mb-auto">{item.prompt}</p>
                       <span className="text-[10px] text-theme-subtext flex items-center gap-1 mt-2"><Clock size={10} />{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                 </div>
             ))}
          </div>
       </div>

      <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div><h2 className="text-2xl font-semibold flex items-center gap-2"><Wand2 className="text-theme-accent" /> 改图助手 <span className="text-xs bg-theme-accent-bg text-theme-accent px-2 py-0.5 rounded-full">Pro</span></h2></div>
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-3 py-2 rounded-theme-sm transition-all border border-theme-border text-sm font-medium bg-theme-card text-theme-subtext hover:bg-theme-input"><History size={18} />历史</button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <div className="w-full lg:w-[450px] flex flex-col gap-4 shrink-0">
            <div className="grid grid-cols-2 gap-4 h-48">
                {[0, 1].map((index) => (
                    <div key={index} onClick={() => index === 0 ? fileInputRef1.current?.click() : fileInputRef2.current?.click()} className={`relative rounded-theme border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group ${!previewUrls[index] ? 'border-theme-border hover:border-theme-accent bg-theme-input/50' : 'border-transparent bg-theme-card'}`}>
                        {previewUrls[index] ? <img src={previewUrls[index]!} className="w-full h-full object-contain p-2" /> : <div className="text-center p-2 pointer-events-none"><Upload size={16} className="mx-auto mb-2 text-theme-subtext"/><p className="text-xs font-bold text-theme-text">{index === 0 ? "底图" : "参考"}</p></div>}
                    </div>
                ))}
            </div>
            <input type="file" ref={fileInputRef1} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 0)} className="hidden" accept="image/*" />
            <input type="file" ref={fileInputRef2} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], 1)} className="hidden" accept="image/*" />

            <div className="flex flex-wrap gap-2 py-1">
                {PRESET_PROMPTS.map((preset, i) => <button key={i} onClick={() => setPrompt(preset.text)} className="px-3 py-1.5 bg-theme-card border border-theme-border rounded-theme-sm text-xs font-medium text-theme-subtext hover:text-theme-accent hover:border-theme-accent hover:bg-theme-accent-bg transition-all">{preset.label}</button>)}
            </div>

            <div className="flex-1 bg-theme-card/60 backdrop-blur-md rounded-theme p-4 shadow-sm border border-theme-border flex flex-col gap-3">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="描述需求..." className="w-full h-32 bg-theme-input border border-theme-border rounded-theme-sm px-4 py-3 text-sm outline-none focus:border-theme-accent transition-all resize-none text-theme-text" />
              <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className={`w-full py-3 rounded-theme-sm font-medium text-sm flex items-center justify-center gap-2 transition-all ${isLoading || !prompt.trim() ? 'bg-theme-input text-theme-subtext cursor-not-allowed' : 'bg-theme-accent text-white hover:opacity-90 shadow-md'}`}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}{isLoading ? '绘制中...' : '开始生成'}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-theme-panel/40 backdrop-blur-sm rounded-theme border border-theme-border p-1 flex flex-col relative shadow-inner min-h-[400px]">
             {resultUrl ? (
               <div className="relative w-full h-full rounded-theme overflow-hidden bg-[url('https://bg-patterns.netlify.app/bg-patterns/transparent.png')] bg-repeat group">
                  <img src={resultUrl} className="w-full h-full object-contain" />
                  <a href={resultUrl} download={`edited-${Date.now()}.png`} className="absolute bottom-6 right-6 bg-white text-black px-5 py-2.5 rounded-full font-medium text-sm shadow-xl flex items-center gap-2 z-10"><Download size={16} /> 下载</a>
               </div>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-theme-subtext"><ImageIcon size={32} className="opacity-20 mb-4" /><p className="text-sm font-medium">效果图区域</p></div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImageEditor;
