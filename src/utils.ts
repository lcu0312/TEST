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

export const DEFAULT_MCP: MCPConfig = {
  id: 'default-mirroverse',
  name: '預設 MirroVerse 故事',
  steps: [
    {
      id: 'story-generation',
      name: '生成互動故事',
      modelId: 'default-text',
      promptTemplate: `基於以下輸入創建一個互動式分支故事：

用戶輸入：{{input.prompt}}
檔案內容：{{input.fileDescription}}

請生成一個包含多個分支選擇的互動故事結構。每個節點應包含：
- imagePrompt: 場景的視覺描述
- subtitle: 簡短的場景描述
- narration: 詳細的語音旁白
- choices: 2-3個選擇選項，每個選項指向下一個節點

請確保故事有至少3-4個節點，包含不同的結局路徑。

回應格式必須是有效的JSON：
{
  "narrative": "完整的故事敘述",
  "storyGraph": {
    "startNodeId": "node1",
    "nodes": [
      {
        "id": "node1",
        "imagePrompt": "場景描述",
        "subtitle": "場景字幕",
        "narration": "語音旁白",
        "choices": [
          {"text": "選擇1", "nextNodeId": "node2"},
          {"text": "選擇2", "nextNodeId": "node3"}
        ]
      }
    ]
  },
  "code": "JSON格式的互動故事腳本"
}`
    }
  ]
};

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
