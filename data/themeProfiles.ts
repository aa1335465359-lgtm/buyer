export type StyleProfile = 'minimal' | 'retro' | 'editorial' | 'playful' | 'terminal';

export interface ThemeProfile {
  id: string;
  name: string;
  color: string;
  styleProfile: StyleProfile;
  tone: string;
  detail: string;
  preview: {
    background: string;
    accent: string;
    border: string;
  };
}

export const STYLE_PROFILE_LABELS: Record<StyleProfile, string> = {
  minimal: '极简',
  retro: '复古',
  editorial: '杂志感',
  playful: '活力',
  terminal: '像素',
};

export const THEME_PROFILES: ThemeProfile[] = [
  { id: 'neo-chinese', name: '中式', color: '#C93F3F', styleProfile: 'editorial', tone: '纸墨层次', detail: '线性留白 + 书卷质感', preview: { background: 'linear-gradient(135deg, #F7F2E4, #D8C9A6)', accent: '#8B3A3A', border: '#3D2B1F' } },
  { id: 'glass', name: '玻璃', color: '#a5b4fc', styleProfile: 'minimal', tone: '冷静透明', detail: '磨砂薄边 + 低阴影', preview: { background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(203,213,225,0.7))', accent: '#3b82f6', border: 'rgba(255,255,255,0.85)' } },
  { id: 'amethyst', name: '紫晶', color: '#4E345C', styleProfile: 'editorial', tone: '晶体切面', detail: '高对比文字 + 深景层次', preview: { background: 'linear-gradient(135deg, #2A1F33, #4C3B66)', accent: '#D8B4FE', border: 'rgba(216,180,254,0.5)' } },
  { id: 'memphis', name: '孟菲', color: '#FFEB3B', styleProfile: 'playful', tone: '图形冲击', detail: '粗边界面 + 夸张互动', preview: { background: 'linear-gradient(135deg, #FFF176, #FF4081)', accent: '#00E5FF', border: '#000000' } },
  { id: 'dopamine', name: '多巴', color: '#002FA7', styleProfile: 'playful', tone: '高饱和糖果', detail: '胶囊形态 + 动态倾斜', preview: { background: 'linear-gradient(135deg, #FFED00, #FF00CC)', accent: '#00CCFF', border: 'rgba(255,255,255,0.8)' } },
  { id: 'maillard', name: '美拉', color: '#8B4513', styleProfile: 'editorial', tone: '皮革复古', detail: '深压纹理 + 金属点缀', preview: { background: 'linear-gradient(135deg, #4E342E, #2D201A)', accent: '#C6A664', border: '#1A100C' } },
  { id: 'minecraft', name: '方块', color: '#5a8e3d', styleProfile: 'terminal', tone: '像素硬边', detail: '直角结构 + 网格边框', preview: { background: 'linear-gradient(135deg, #8B6634, #5F4228)', accent: '#FFFF55', border: '#000000' } },
  { id: 'kawaii', name: '甜心', color: '#f9a8d4', styleProfile: 'playful', tone: '软糖奶油', detail: '圆角卡片 + 轻浮雕', preview: { background: 'linear-gradient(135deg, #FFE4F1, #FFD1E8)', accent: '#FF5C8D', border: '#FFC1D8' } },
  { id: 'wooden', name: '原木', color: '#d4a373', styleProfile: 'editorial', tone: '纸张木质', detail: '细线分隔 + 文档排版', preview: { background: 'linear-gradient(135deg, #F8F1E3, #E0C9A6)', accent: '#A0522D', border: '#D4C5A9' } },
  { id: 'watercolor', name: '水彩', color: '#93c5fd', styleProfile: 'minimal', tone: '湿润晕染', detail: '低对比层次 + 柔和边界', preview: { background: 'linear-gradient(135deg, #1B2B44, #2F4D73)', accent: '#F4C430', border: 'rgba(244,196,48,0.4)' } },
  { id: 'oil-slick', name: '虹彩', color: '#FF7B89', styleProfile: 'playful', tone: '炫彩光泽', detail: '悬浮卡片 + 渐变边缘', preview: { background: 'linear-gradient(135deg, #FF9ED8, #8A2BE2)', accent: '#00F0FF', border: 'rgba(255,255,255,0.85)' } },
  { id: 'neon-billboard', name: '霓虹', color: '#FF3EA6', styleProfile: 'retro', tone: '街机夜幕', detail: '扫描线 + 像素边框', preview: { background: 'linear-gradient(135deg, #150520, #0a020d)', accent: '#FFDF4A', border: '#4DADFF' } },
  { id: 'deepNebula', name: '星云', color: '#4DA6FF', styleProfile: 'minimal', tone: '深空低对比', detail: '无边框浮层 + 轻分隔', preview: { background: 'linear-gradient(135deg, #050714, #111A3A)', accent: '#8E9DFF', border: 'rgba(255,255,255,0.12)' } },
];

export const getThemeProfile = (themeId: string): ThemeProfile =>
  THEME_PROFILES.find((profile) => profile.id === themeId) ?? THEME_PROFILES[1];
