import { MCPConfig, LorebookCategory } from './types';

export const LOREBOOK_CATEGORIES: LorebookCategory[] = ['角色', '地點', '物品', '傳說'];

export const MORANDI_COLORS = {
  primary: '#d4c4a8',
  primaryHover: '#c4b498',
  background: '#f5f1eb',
  backgroundDark: '#e8ddd4',
  text: '#8b7355',
  textLight: '#a68b5b',
  border: '#d4c4a8',
  accent: '#b8a082'
};

export const DEFAULT_MCPS: MCPConfig[] = [
  {
    id: 'echo-board',
    name: '同步心象筆記板 (EchoBoard)',
    steps: [
      {
        id: 'scene-analysis',
        name: '場景分析',
        modelId: 'auto-select-vision',
        promptTemplate: `分析輸入內容並生成多版本視角的基礎場景概念：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

請根據輸入（文本/圖片）生成多個視角的場景描述和角色核心概念。

回應格式：
{
  "narrative": "場景分析結果",
  "storyGraph": {
    "startNodeId": "scene1",
    "nodes": [
      {
        "id": "scene1",
        "imagePrompt": "主場景視覺描述",
        "subtitle": "場景標題",
        "narration": "場景敘述",
        "choices": [
          {"text": "視角1", "nextNodeId": "perspective1"},
          {"text": "視角2", "nextNodeId": "perspective2"}
        ]
      }
    ]
  },
  "code": "場景數據結構"
}`
      }
    ]
  },
  {
    id: 'multisight-editor',
    name: '多視域同步編輯器 (MultiSight Editor)',
    steps: [
      {
        id: 'multi-perspective',
        name: '多角度版本故事編輯',
        modelId: 'auto-select-text',
        promptTemplate: `創建多角度版本故事編輯，形成複雜世界觀分支：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

生成包含多個角色視角的複雜故事分支結構。

回應格式：
{
  "narrative": "多視角故事敘述",
  "storyGraph": {
    "startNodeId": "main",
    "nodes": [
      {
        "id": "main",
        "imagePrompt": "主場景",
        "subtitle": "選擇視角",
        "narration": "故事開始",
        "choices": [
          {"text": "角色A視角", "nextNodeId": "viewA"},
          {"text": "角色B視角", "nextNodeId": "viewB"},
          {"text": "全知視角", "nextNodeId": "viewAll"}
        ]
      }
    ]
  },
  "code": "多視角故事結構"
}`
      }
    ]
  },
  {
    id: 'flow-shift',
    name: '非線性敘事模擬器 (FlowShift)',
    steps: [
      {
        id: 'nonlinear-story',
        name: '非線性故事生成',
        modelId: 'auto-select-creative',
        promptTemplate: `使用者互動改變主線走向，生成多宇宙敘事可能性：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

創建非線性敘事結構，允許時間跳躍和平行宇宙分支。

回應格式：
{
  "narrative": "非線性敘事描述",
  "storyGraph": {
    "startNodeId": "timeline1",
    "nodes": [
      {
        "id": "timeline1",
        "imagePrompt": "時間線場景",
        "subtitle": "時空選擇",
        "narration": "時間分岔點",
        "choices": [
          {"text": "改變過去", "nextNodeId": "past"},
          {"text": "影響現在", "nextNodeId": "present"},
          {"text": "預見未來", "nextNodeId": "future"}
        ]
      }
    ]
  },
  "code": "時間線數據結構"
}`
      }
    ]
  },
  {
    id: 'intent-nav',
    name: '意圖導向導航界面 (IntentNav)',
    steps: [
      {
        id: 'intent-analysis',
        name: '意圖分析導航',
        modelId: 'auto-select-analysis',
        promptTemplate: `根據選擇傾向自動導引敘事與世界架構探索路徑：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

分析用戶意圖並提供智能導航選項。

回應格式：
{
  "narrative": "意圖分析結果",
  "storyGraph": {
    "startNodeId": "intent-hub",
    "nodes": [
      {
        "id": "intent-hub",
        "imagePrompt": "導航中心",
        "subtitle": "選擇探索方向",
        "narration": "系統分析您的偏好",
        "choices": [
          {"text": "探索世界觀", "nextNodeId": "worldbuilding"},
          {"text": "角色發展", "nextNodeId": "character"},
          {"text": "情節推進", "nextNodeId": "plot"}
        ]
      }
    ]
  },
  "code": "意圖導航結構"
}`
      }
    ]
  },
  {
    id: 'context-forge',
    name: '情境對話建構器 (ContextForge)',
    steps: [
      {
        id: 'context-building',
        name: '情境對話生成',
        modelId: 'auto-select-dialogue',
        promptTemplate: `角色背景+敘事互動生成動態文本場景：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

構建豐富的對話情境和角色互動場景。

回應格式：
{
  "narrative": "情境對話場景",
  "storyGraph": {
    "startNodeId": "dialogue-start",
    "nodes": [
      {
        "id": "dialogue-start",
        "imagePrompt": "對話場景",
        "subtitle": "角色互動",
        "narration": "對話開始",
        "choices": [
          {"text": "友善回應", "nextNodeId": "friendly"},
          {"text": "謹慎回應", "nextNodeId": "cautious"},
          {"text": "挑戰回應", "nextNodeId": "challenge"}
        ]
      }
    ]
  },
  "code": "對話系統結構"
}`
      }
    ]
  },
  {
    id: 'reso-tale',
    name: '共振式故事生成器 (ResoTale)',
    steps: [
      {
        id: 'resonance-story',
        name: '共振故事生成',
        modelId: 'auto-select-emotional',
        promptTemplate: `根據圖片/情緒調性，生成具共感性的敘事風格與宇宙核心衝突：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

創建情感共振的故事，強調情緒連結和核心衝突。

回應格式：
{
  "narrative": "共振式敘事",
  "storyGraph": {
    "startNodeId": "emotional-core",
    "nodes": [
      {
        "id": "emotional-core",
        "imagePrompt": "情感核心場景",
        "subtitle": "情感選擇",
        "narration": "感受內心的共鳴",
        "choices": [
          {"text": "擁抱情感", "nextNodeId": "embrace"},
          {"text": "抗拒感受", "nextNodeId": "resist"},
          {"text": "探索深層", "nextNodeId": "explore"}
        ]
      }
    ]
  },
  "code": "情感共振結構"
}`
      }
    ]
  },
  {
    id: 'dream-layer',
    name: '虛擬夢境生成平台 (DreamLayer)',
    steps: [
      {
        id: 'dream-generation',
        name: '夢境故事生成',
        modelId: 'auto-select-surreal',
        promptTemplate: `將上述文本與情節場景視覺化為一個可漫遊的故事空間：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

創建超現實的夢境般故事空間，允許自由探索。

回應格式：
{
  "narrative": "夢境空間描述",
  "storyGraph": {
    "startNodeId": "dream-entry",
    "nodes": [
      {
        "id": "dream-entry",
        "imagePrompt": "夢境入口",
        "subtitle": "進入夢境",
        "narration": "現實與夢境的邊界模糊",
        "choices": [
          {"text": "深入夢境", "nextNodeId": "deep-dream"},
          {"text": "保持清醒", "nextNodeId": "lucid"},
          {"text": "隨波逐流", "nextNodeId": "drift"}
        ]
      }
    ]
  },
  "code": "夢境空間結構"
}`
      }
    ]
  },
  {
    id: 'narrative-weaver',
    name: '敘事編織器 (NarrativeWeaver)',
    steps: [
      {
        id: 'narrative-weaving',
        name: '敘事編織',
        modelId: 'auto-select-creative',
        promptTemplate: `編織複雜的敘事結構，整合多個故事線：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

創建多層次的敘事結構，將不同的故事元素編織在一起。

回應格式：
{
  "narrative": "編織後的敘事",
  "storyGraph": {
    "startNodeId": "weave-start",
    "nodes": [
      {
        "id": "weave-start",
        "imagePrompt": "敘事交織點",
        "subtitle": "故事線匯聚",
        "narration": "多個故事線開始交織",
        "choices": [
          {"text": "主線故事", "nextNodeId": "main-thread"},
          {"text": "支線故事", "nextNodeId": "sub-thread"},
          {"text": "隱藏故事", "nextNodeId": "hidden-thread"}
        ]
      }
    ]
  },
  "code": "敘事編織結構"
}`
      }
    ]
  },
  {
    id: 'world-architect',
    name: '世界建構師 (WorldArchitect)',
    steps: [
      {
        id: 'world-building',
        name: '世界建構',
        modelId: 'auto-select-creative',
        promptTemplate: `構建詳細的虛構世界，包含地理、文化、歷史等元素：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

創建完整的世界觀，包含地理環境、社會結構、文化背景等。

回應格式：
{
  "narrative": "世界建構描述",
  "storyGraph": {
    "startNodeId": "world-overview",
    "nodes": [
      {
        "id": "world-overview",
        "imagePrompt": "世界全景",
        "subtitle": "探索世界",
        "narration": "一個全新的世界展現在眼前",
        "choices": [
          {"text": "探索地理", "nextNodeId": "geography"},
          {"text": "了解文化", "nextNodeId": "culture"},
          {"text": "研究歷史", "nextNodeId": "history"}
        ]
      }
    ]
  },
  "code": "世界建構數據"
}`
      }
    ]
  }
];

export const DEFAULT_MCP = DEFAULT_MCPS[0];

export function generateStorageKey(userId: string, key: string): string {
  return `mirroverse_${userId}_${key}`;
}

export function generateTitleFromNarrative(narrative: string): string {
  const sentences = narrative.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim();
  if (firstSentence && firstSentence.length > 0) {
    return firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;
  }
  return '未命名創作';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
