import { ModelConfig, MCPConfig, GeneratorOutput, LorebookEntry } from '../types';

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

async function generateImage(model: ModelConfig, prompt: string): Promise<string> {
  if (model.provider !== 'google') {
    throw new Error('Image generation only supported with Google AI');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(0, 0, 400, 300);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 300);
  
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI 生成圖片', 200, 150);
  ctx.font = '12px Arial';
  ctx.fillText(prompt.substring(0, 30) + '...', 200, 180);
  
  return canvas.toDataURL();
}

export async function sendChatMessage(
  model: ModelConfig,
  message: string,
  attachments: File[] = []
): Promise<string> {
  let fullPrompt = message;
  
  for (const file of attachments) {
    if (file.type.startsWith('text/')) {
      const text = await file.text();
      fullPrompt += `\n\n附件內容 (${file.name}):\n${text}`;
    } else {
      fullPrompt += `\n\n已上傳檔案: ${file.name} (${file.type})`;
    }
  }
  
  return await callAiModel(model, fullPrompt);
}
