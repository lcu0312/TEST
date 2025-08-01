import React, { useState } from 'react';
import { Upload, Zap, Save, Copy } from 'lucide-react';
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
    if (!prompt.trim() || !selectedMcpId) return;

    const selectedMcp = mcps.find(m => m.id === selectedMcpId);
    if (!selectedMcp) return;

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

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        },
        body: JSON.stringify({
          prompt,
          mcpConfigId: selectedMcpId,
          files
        })
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      setOutput(result);
      setActiveTab('visual');
    } catch (error) {
      console.error('Generation failed:', error);
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
            onClick={handleGenerate}
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

          <div className="border-t border-stone-300 p-4">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Save size={16} />
              儲存至創作庫
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
