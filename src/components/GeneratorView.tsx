import React, { useState } from 'react';
import { Upload, Zap, Save, Copy, Download } from 'lucide-react';
import { MCPConfig, GeneratorOutput, SavedCreation } from '../types';
import { generateTitleFromNarrative, generateId } from '../utils';
import { InteractivePlayer } from './InteractivePlayer';

interface GeneratorViewProps {
  mcps: MCPConfig[];
  onSaveCreation: (creation: SavedCreation) => void;
}

export function GeneratorView({ mcps, onSaveCreation }: GeneratorViewProps) {
  const [prompt, setPrompt] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [selectedMcpId, setSelectedMcpId] = useState(mcps[0]?.id || '');
  const [output, setOutput] = useState<GeneratorOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [activeTab, setActiveTab] = useState<'narrative' | 'visual' | 'code'>('narrative');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handleGenerate = async () => {
    console.log('GeneratorView: handleGenerate called', { prompt: prompt.trim(), selectedMcpId });
    
    if (!prompt.trim() || !selectedMcpId) {
      console.log('GeneratorView: Validation failed', { hasPrompt: !!prompt.trim(), hasSelectedMcp: !!selectedMcpId });
      return;
    }

    const selectedMcp = mcps.find(m => m.id === selectedMcpId);
    if (!selectedMcp) {
      console.log('GeneratorView: Selected MCP not found', { selectedMcpId, availableMcps: mcps.map(m => m.id) });
      return;
    }

    console.log('GeneratorView: Starting generation...', { selectedMcp: selectedMcp.name });
    setIsGenerating(true);
    setCurrentStep('準備生成...');

    try {
      const files = [];
      if (attachedFile) {
        files.push({
          name: attachedFile.name,
          type: attachedFile.type,
          size: attachedFile.size
        });
      }

      console.log('GeneratorView: Making API call...', { 
        url: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/generate`,
        payload: { prompt, mcp_id: selectedMcpId, user_settings: {}, reference_files: files || [] }
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        },
        body: JSON.stringify({
          prompt,
          mcp_id: selectedMcpId,
          user_settings: {},
          reference_files: files || []
        })
      });

      console.log('GeneratorView: API response received', { status: response.status, ok: response.ok });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('GeneratorView: API result received', { hasNarrative: !!result.narrative, hasStoryGraph: !!result.storyGraph });
      setOutput(result);
      setActiveTab('visual');
    } catch (error) {
      console.error('GeneratorView: Generation failed:', error);
      alert('生成失敗，請檢查設定和網路連接');
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
    }
  };

  const handleSave = () => {
    if (!output) return;

    const thumbnailUrl = output.storyGraph.nodes[0]?.imageUrl || '';
    const title = generateTitleFromNarrative(output.narrative);

    const creation: SavedCreation = {
      id: generateId(),
      title,
      createdAt: new Date().toISOString(),
      thumbnailUrl,
      output
    };

    onSaveCreation(creation);
    alert('已儲存至創作庫！');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已複製到剪貼板！');
  };

  const handleDownloadProject = () => {
    if (!output) return;

    const projectData = {
      title: generateTitleFromNarrative(output.narrative),
      created_at: new Date().toISOString(),
      prompt: prompt,
      mcp_config: mcps.find(m => m.id === selectedMcpId)?.name || 'Default',
      output: output,
      version: '1.0.0'
    };

    const projectBlob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const projectUrl = URL.createObjectURL(projectBlob);
    const projectLink = document.createElement('a');
    projectLink.href = projectUrl;
    projectLink.download = `${projectData.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_project.json`;
    projectLink.click();
    URL.revokeObjectURL(projectUrl);

    const narrativeBlob = new Blob([output.narrative], { type: 'text/plain; charset=utf-8' });
    const narrativeUrl = URL.createObjectURL(narrativeBlob);
    const narrativeLink = document.createElement('a');
    narrativeLink.href = narrativeUrl;
    narrativeLink.download = `${projectData.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_narrative.txt`;
    narrativeLink.click();
    URL.revokeObjectURL(narrativeUrl);

    const codeBlob = new Blob([output.code], { type: 'text/javascript; charset=utf-8' });
    const codeUrl = URL.createObjectURL(codeBlob);
    const codeLink = document.createElement('a');
    codeLink.href = codeUrl;
    codeLink.download = `${projectData.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_code.js`;
    codeLink.click();
    URL.revokeObjectURL(codeUrl);

    const storyGraphBlob = new Blob([JSON.stringify(output.storyGraph, null, 2)], { type: 'application/json' });
    const storyGraphUrl = URL.createObjectURL(storyGraphBlob);
    const storyGraphLink = document.createElement('a');
    storyGraphLink.href = storyGraphUrl;
    storyGraphLink.download = `${projectData.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_story-graph.json`;
    storyGraphLink.click();
    URL.revokeObjectURL(storyGraphUrl);

    const readmeContent = `# ${projectData.title}

## 專案資訊
- 創建時間: ${new Date(projectData.created_at).toLocaleString('zh-TW')}
- 原始提示: ${prompt}
- MCP 管道: ${projectData.mcp_config}
- 版本: ${projectData.version}

## 檔案說明
- \`project.json\`: 完整專案元數據
- \`narrative.txt\`: 生成的敘述內容
- \`code.js\`: 生成的程式碼
- \`story-graph.json\`: 互動故事圖結構
- \`README.md\`: 此說明檔案

## 使用方式
1. 將所有檔案放在同一個資料夾中
2. 使用 MirroVerse Engine 匯入 \`project.json\` 檔案
3. 或者直接查看各個檔案內容

---
由 MirroVerse Engine 生成
`;

    const readmeBlob = new Blob([readmeContent], { type: 'text/markdown; charset=utf-8' });
    const readmeUrl = URL.createObjectURL(readmeBlob);
    const readmeLink = document.createElement('a');
    readmeLink.href = readmeUrl;
    readmeLink.download = `${projectData.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_README.md`;
    readmeLink.click();
    URL.revokeObjectURL(readmeUrl);
  };

  return (
    <div className="space-y-6">
      <div className="bg-stone-200/50 border border-stone-300 rounded-2xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              創意想法
            </label>
            <textarea
              placeholder="輸入您的創意想法..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                檔案附件 (圖片/影片/文字)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,video/*,.txt,.doc,.docx,.pdf"
                  onChange={handleFileUpload}
                  id="file-upload"
                  className="hidden"
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <Upload size={20} />
                  {attachedFile ? `已選擇: ${attachedFile.name}` : '上傳檔案 (圖片/影片/文字)'}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                創意管線
              </label>
              <select
                value={selectedMcpId}
                onChange={(e) => setSelectedMcpId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {mcps.map(mcp => (
                  <option key={mcp.id} value={mcp.id}>{mcp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('GeneratorView: Button mousedown, calling handleGenerate');
              if (!isGenerating && prompt.trim()) {
                handleGenerate();
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('GeneratorView: Button clicked, calling handleGenerate');
              if (!isGenerating && prompt.trim()) {
                handleGenerate();
              }
            }}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-stone-400 disabled:to-stone-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            <Zap size={20} />
            {isGenerating ? currentStep : '啟動引擎'}
          </button>
        </div>
      </div>

      {output && (
        <div className="bg-stone-200/50 border border-stone-300 rounded-2xl overflow-hidden">
          <div className="flex border-b border-stone-300">
            {[
              { key: 'narrative', label: '文字輸出', icon: '📝' },
              { key: 'visual', label: '互動播放', icon: '🎬' },
              { key: 'code', label: '程式輸出', icon: '💻' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-amber-600 border-b-2 border-amber-600 bg-stone-300/50'
                    : 'text-stone-600 hover:text-stone-800 hover:bg-stone-300/30'
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'narrative' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">故事敘述</h3>
                  <button
                    onClick={() => copyToClipboard(output.narrative)}
                    className="flex items-center gap-2 px-3 py-2 bg-stone-400 hover:bg-stone-500 text-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    複製
                  </button>
                </div>
                <div className="bg-stone-100 border border-stone-300 rounded-lg p-4">
                  <pre className="text-stone-600 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {output.narrative}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'visual' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">互動故事播放</h3>
                <InteractivePlayer storyGraph={output.storyGraph} />
              </div>
            )}

            {activeTab === 'code' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">程式碼輸出</h3>
                  <button
                    onClick={() => copyToClipboard(output.code)}
                    className="flex items-center gap-2 px-3 py-2 bg-stone-400 hover:bg-stone-500 text-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    複製
                  </button>
                </div>
                <div className="bg-stone-800 border border-stone-600 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm">
                    {output.code}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-stone-300 p-4 flex gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Save size={16} />
              儲存至創作庫
            </button>
            
            <button
              onClick={handleDownloadProject}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Download size={16} />
              下載專案
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
