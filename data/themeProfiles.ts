export type StyleProfile = 'minimal' | 'retro' | 'editorial' | 'playful' | 'terminal';

export interface ThemeProfile {
  id: string;
  name: string;
  color: string;
  styleProfile: StyleProfile;
}

export const themeProfiles: ThemeProfile[] = [
  { id: 'neo-chinese', name: '中式', color: '#C93F3F', styleProfile: 'editorial' },
  { id: 'glass', name: '玻璃', color: '#a5b4fc', styleProfile: 'minimal' },
  { id: 'amethyst', name: '紫晶', color: '#4E345C', styleProfile: 'editorial' },
  { id: 'memphis', name: '孟菲', color: '#FFEB3B', styleProfile: 'playful' },
  { id: 'dopamine', name: '多巴', color: '#002FA7', styleProfile: 'playful' },
  { id: 'maillard', name: '美拉', color: '#8B4513', styleProfile: 'editorial' },
  { id: 'minecraft', name: '方块', color: '#5a8e3d', styleProfile: 'retro' },
  { id: 'kawaii', name: '甜心', color: '#f9a8d4', styleProfile: 'playful' },
  { id: 'wooden', name: '原木', color: '#d4a373', styleProfile: 'editorial' },
  { id: 'watercolor', name: '水彩', color: '#93c5fd', styleProfile: 'minimal' },
  { id: 'oil-slick', name: '虹彩', color: '#FF7B89', styleProfile: 'playful' },
  { id: 'neon-billboard', name: '霓虹', color: '#FF3EA6', styleProfile: 'terminal' },
  { id: 'deepNebula', name: '星云', color: '#4DA6FF', styleProfile: 'minimal' },
];

export const themeProfileMap = Object.fromEntries(
  themeProfiles.map((profile) => [profile.id, profile]),
) as Record<string, ThemeProfile>;
