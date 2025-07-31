export interface User {
  username: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'ollama';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface MCPStep {
  id: string;
  name: string;
  modelId: string;
  promptTemplate: string;
}

export interface MCPConfig {
  id: string;
  name: string;
  steps: MCPStep[];
}

export interface Choice {
  text: string;
  nextNodeId: string;
}

export interface StoryNode {
  id: string;
  imagePrompt: string;
  subtitle: string;
  narration: string;
  imageUrl?: string;
  choices: Choice[];
}

export interface StoryGraph {
  startNodeId: string;
  nodes: StoryNode[];
}

export interface GeneratorOutput {
  narrative: string;
  storyGraph: StoryGraph;
  code: string;
}

export interface SavedCreation {
  id: string;
  title: string;
  createdAt: string;
  thumbnailUrl: string;
  output: GeneratorOutput;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: File[];
}

export type ViewMode = 'generator' | 'chat' | 'library';
export type OutputTab = 'narrative' | 'visual' | 'code';

export interface LorebookEntry {
  id: string;
  keyword: string;
  description: string;
  category: string;
}

export type LorebookCategory = '角色' | '地點' | '物品' | '傳說';
