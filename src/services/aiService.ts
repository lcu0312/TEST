import { ModelConfig, MCPConfig, GeneratorOutput, LorebookEntry, FileAnalysis, MultiAIWorkflow, AITask } from '../types';

export async function runMcpPipeline(
  mcp: MCPConfig,
  models: ModelConfig[],
  input: { prompt: string; imageDescription?: string },
  lorebook: LorebookEntry[] = []
): Promise<GeneratorOutput> {
  let stepResults: Record<string, any> = { input };

  for (let i = 0; i < mcp.steps.length; i++) {
    const step = mcp.steps[i];
    const model = models.find(m => m.id === step.modelId);
    
    if (!model) {
      throw new Error(`Model ${step.modelId} not found`);
    }

    let prompt = step.promptTemplate;
    
    const lorebookContext = injectLorebookContext(prompt, lorebook);
    if (lorebookContext) {
      prompt = lorebookContext + '\n\n' + prompt;
    }

    prompt = prompt.replace(/\{\{([^}]+)\}\}/g, (match: string, path: string) => {
      const keys = path.split('.');
      let value: any = stepResults;
      for (const key of keys) {
        value = value?.[key];
      }
      return value || match;
    });

    const result = await callAiModel(model, prompt);
    stepResults[step.id] = { result };
  }

  const finalStep = mcp.steps[mcp.steps.length - 1];
  const finalResult = stepResults[finalStep.id].result;
  
  let parsedResult: GeneratorOutput;
  try {
    parsedResult = JSON.parse(finalResult);
  } catch {
    parsedResult = {
      narrative: finalResult,
      storyGraph: {
        startNodeId: 'node1',
        nodes: [{
          id: 'node1',
          imagePrompt: input.prompt || 'A mysterious scene',
          subtitle: '故事開始',
          narration: finalResult.substring(0, 200),
          choices: []
        }]
      },
      code: JSON.stringify({ story: finalResult }, null, 2)
    };
  }

  const imageModel = models.find(m => m.provider === 'google');
  if (imageModel && parsedResult.storyGraph) {
    for (const node of parsedResult.storyGraph.nodes) {
      try {
        node.imageUrl = await generateImage(imageModel, node.imagePrompt);
      } catch (error) {
        console.error('Failed to generate image:', error);
        node.imageUrl = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23333"/><text x="50%" y="50%" text-anchor="middle" fill="white">圖片生成失敗</text></svg>`;
      }
    }
  }

  return parsedResult;
}

function injectLorebookContext(prompt: string, lorebook: LorebookEntry[]): string | null {
  if (!lorebook.length) return null;

  const relevantEntries = lorebook.filter(entry => 
    prompt.toLowerCase().includes(entry.keyword.toLowerCase())
  );

  if (!relevantEntries.length) return null;

  const contextLines = relevantEntries.map(entry => 
    `${entry.keyword}: ${entry.description}`
  );

  return `Context from your Lorebook:\n${contextLines.join('\n')}`;
}

async function callAiModel(model: ModelConfig, prompt: string): Promise<string> {
  if (model.provider === 'google') {
    return await callGoogleAI(model, prompt);
  } else if (model.provider === 'ollama') {
    return await callOllamaAI(model, prompt);
  } else if (model.provider === 'openai') {
    return await callOpenAI(model, prompt);
  } else if (model.provider === 'anthropic') {
    return await callAnthropicAI(model, prompt);
  } else if (model.provider === 'azure') {
    return await callAzureAI(model, prompt);
  } else if (model.provider === 'huggingface') {
    return await callHuggingFaceAI(model, prompt);
  } else if (model.provider === 'cohere') {
    return await callCohereAI(model, prompt);
  } else if (model.provider === 'palm') {
    return await callPaLMAI(model, prompt);
  }
  throw new Error(`Unsupported provider: ${model.provider}`);
}

async function callGoogleAI(model: ModelConfig, prompt: string): Promise<string> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': model.apiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}

async function callOllamaAI(model: ModelConfig, prompt: string): Promise<string> {
  const baseUrl = model.baseUrl || 'http://localhost:11434';
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.model || 'llama2',
      prompt: prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || 'No response generated';
}

async function callOpenAI(model: ModelConfig, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${model.apiKey}`
    },
    body: JSON.stringify({
      model: model.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated';
}

async function callAnthropicAI(model: ModelConfig, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': model.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model.model || 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'No response generated';
}

async function callAzureAI(model: ModelConfig, prompt: string): Promise<string> {
  const baseUrl = model.baseUrl || 'https://your-resource.openai.azure.com';
  const response = await fetch(`${baseUrl}/openai/deployments/${model.model || 'gpt-35-turbo'}/chat/completions?api-version=2023-12-01-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': model.apiKey
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated';
}

async function callHuggingFaceAI(model: ModelConfig, prompt: string): Promise<string> {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model.model || 'microsoft/DialoGPT-medium'}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${model.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_length: 2000 }
    })
  });

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data[0]?.generated_text || data.generated_text || 'No response generated';
}

async function callCohereAI(model: ModelConfig, prompt: string): Promise<string> {
  const response = await fetch('https://api.cohere.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${model.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.model || 'command',
      prompt: prompt,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`Cohere API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.generations?.[0]?.text || 'No response generated';
}

async function callPaLMAI(model: ModelConfig, prompt: string): Promise<string> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': model.apiKey
    },
    body: JSON.stringify({
      prompt: { text: prompt },
      temperature: 0.7,
      candidateCount: 1
    })
  });

  if (!response.ok) {
    throw new Error(`PaLM API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.output || 'No response generated';
}

async function generateImage(model: ModelConfig, prompt: string): Promise<string> {
  if (model.provider !== 'google') {
    throw new Error('Image generation only supported with Google AI');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(0, 0, 400, 300);
  gradient.addColorStop(0, '#d4c4a8');
  gradient.addColorStop(1, '#b8a082');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 300);
  
  ctx.fillStyle = '#8b7355';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI 生成圖片', 200, 150);
  ctx.font = '12px Arial';
  ctx.fillText(prompt.substring(0, 30) + '...', 200, 180);
  
  return canvas.toDataURL();
}

export async function analyzeFile(file: File, models: ModelConfig[]): Promise<FileAnalysis> {
  const fileType = file.type;
  let contentType: 'text' | 'image' | 'video' | 'audio' | 'document';
  let suggestedModels: string[] = [];
  let extractedContent: string | undefined;
  let confidence = 0.8;

  if (fileType.startsWith('image/')) {
    contentType = 'image';
    suggestedModels = models.filter(m => 
      ['google', 'openai', 'anthropic'].includes(m.provider) || m.name.toLowerCase().includes('vision')
    ).slice(0, 3).map(m => m.id);
    confidence = 0.9;
  } else if (fileType.startsWith('video/')) {
    contentType = 'video';
    suggestedModels = models.filter(m => 
      ['google', 'openai'].includes(m.provider) || m.name.toLowerCase().includes('video')
    ).slice(0, 2).map(m => m.id);
    extractedContent = `視頻檔案: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    confidence = 0.85;
  } else if (fileType.startsWith('audio/')) {
    contentType = 'audio';
    suggestedModels = models.filter(m => 
      ['google', 'openai', 'azure'].includes(m.provider) || m.name.toLowerCase().includes('audio')
    ).slice(0, 2).map(m => m.id);
    extractedContent = `音頻檔案: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
    confidence = 0.8;
  } else if (fileType.startsWith('text/') || fileType.includes('document') || fileType.includes('pdf')) {
    contentType = 'document';
    const prioritizedModels = models.sort((a, b) => {
      const priority = { 'anthropic': 3, 'openai': 2, 'google': 1, 'ollama': 0 };
      return (priority[b.provider as keyof typeof priority] || 0) - (priority[a.provider as keyof typeof priority] || 0);
    });
    suggestedModels = prioritizedModels.map(m => m.id);
    
    if (fileType.startsWith('text/')) {
      try {
        extractedContent = await file.text();
        confidence = 0.95;
      } catch (error) {
        extractedContent = `無法讀取文字內容: ${file.name}`;
        confidence = 0.5;
      }
    } else {
      extractedContent = `文檔檔案: ${file.name}, 類型: ${fileType}`;
      confidence = 0.7;
    }
  } else {
    contentType = 'document';
    suggestedModels = models.map(m => m.id);
    extractedContent = `未知檔案類型: ${file.name} (${fileType})`;
    confidence = 0.3;
  }

  if (suggestedModels.length === 0 && models.length > 0) {
    suggestedModels = [models[0].id];
  }

  return {
    fileType,
    contentType,
    suggestedModels,
    extractedContent,
    confidence
  };
}

export async function processMultiAIWorkflow(
  workflow: MultiAIWorkflow,
  models: ModelConfig[]
): Promise<string> {
  const results: string[] = [];
  
  for (const task of workflow.tasks) {
    const model = models.find(m => m.id === task.modelId);
    if (!model) {
      throw new Error(`模型 ${task.modelId} 未找到`);
    }

    task.status = 'processing';
    
    try {
      let prompt = '';
      if (typeof task.input === 'string') {
        prompt = task.input;
      } else {
        const fileAnalysis = await analyzeFile(task.input, models);
        prompt = `處理檔案: ${task.input.name}\n類型: ${fileAnalysis.contentType}\n內容: ${fileAnalysis.extractedContent || '無法提取內容'}`;
      }

      const result = await callAiModel(model, prompt);
      task.output = result;
      task.status = 'completed';
      results.push(`${task.type} 處理結果 (${model.name}): ${result}`);
    } catch (error) {
      task.status = 'error';
      task.output = `處理失敗: ${error}`;
      results.push(`${task.type} 處理失敗: ${error}`);
    }
  }

  const coordinatorModel = models.find(m => m.id === workflow.coordinatorModelId);
  if (coordinatorModel && results.length > 1) {
    const coordinationPrompt = `請整合以下多個 AI 的處理結果，生成最終回應：\n\n${results.join('\n\n')}`;
    workflow.finalOutput = await callAiModel(coordinatorModel, coordinationPrompt);
    workflow.status = 'completed';
    return workflow.finalOutput;
  }

  workflow.finalOutput = results.join('\n\n');
  workflow.status = 'completed';
  return workflow.finalOutput;
}

export async function sendChatMessage(
  model: ModelConfig,
  message: string,
  attachments: File[] = [],
  workflow?: MultiAIWorkflow,
  models: ModelConfig[] = []
): Promise<string> {
  if (workflow && models.length > 0) {
    return await processMultiAIWorkflow(workflow, models);
  }

  let fullPrompt = message;
  
  for (const file of attachments) {
    if (file.type.startsWith('text/')) {
      const text = await file.text();
      fullPrompt += `\n\n附件內容 (${file.name}):\n${text}`;
    } else if (file.type.startsWith('video/')) {
      fullPrompt += `\n\n視頻檔案: ${file.name} (${file.type})\n大小: ${(file.size / 1024 / 1024).toFixed(2)}MB\n請分析此視頻內容並提供相關回應。`;
    } else if (file.type.startsWith('audio/')) {
      fullPrompt += `\n\n音頻檔案: ${file.name} (${file.type})\n大小: ${(file.size / 1024 / 1024).toFixed(2)}MB\n請分析此音頻內容並提供相關回應。`;
    } else if (file.type.includes('pdf') || file.type.includes('document')) {
      fullPrompt += `\n\n文檔檔案: ${file.name} (${file.type})\n請分析此文檔內容並提供相關回應。`;
    } else {
      fullPrompt += `\n\n已上傳檔案: ${file.name} (${file.type})`;
    }
  }
  
  return await callAiModel(model, fullPrompt);
}

export function createDefaultWorkflow(files: File[], models: ModelConfig[]): MultiAIWorkflow {
  const tasks: AITask[] = files.map((file, index) => ({
    id: `task-${index}`,
    type: file.type.startsWith('image/') ? 'image' : 
          file.type.startsWith('video/') ? 'video' :
          file.type.startsWith('audio/') ? 'audio' :
          file.type.startsWith('text/') ? 'text' : 'document',
    modelId: models[0]?.id || '',
    input: file,
    status: 'pending'
  }));

  return {
    id: `workflow-${Date.now()}`,
    name: '自動協作工作流程',
    tasks,
    coordinatorModelId: models[0]?.id || '',
    status: 'pending'
  };
}
