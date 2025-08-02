export interface User {
  username: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'google' | 'ollama' | 'openai' | 'anthropic' | 'azure' | 'huggingface' | 'cohere' | 'palm';
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MCPStep {
  id: string;
  name: string;
  modelId: string;
  promptTemplate: string;
  externalConnector?: string;
}

export interface MCPConfig {
  id: string;
  name: string;
  steps: MCPStep[];
  externalConnectors?: ExternalServiceConnector[];
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
  fileAnalysis?: FileAnalysis[];
  workflow?: MultiAIWorkflow;
  selectedOutputModel?: string;
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

export interface AITask {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  modelId: string;
  input: string | File;
  output?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface MultiAIWorkflow {
  id: string;
  name: string;
  tasks: AITask[];
  coordinatorModelId: string;
  finalOutput?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface FileAnalysis {
  fileType: string;
  contentType: 'text' | 'image' | 'video' | 'audio' | 'document';
  suggestedModels: string[];
  extractedContent?: string;
  confidence: number;
}

export interface AICollaborationConfig {
  enableAutoDetection: boolean;
  preferredModels: Record<string, string>;
  workflowTemplates: MultiAIWorkflow[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  userId: string;
}

export interface ExternalServiceConnector {
  id: string;
  name: string;
  type: 'google-colab' | 'webhook' | 'api';
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  enabled: boolean;
}
