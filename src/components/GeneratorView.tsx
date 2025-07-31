import React, { useState } from 'react';
import { Upload, Zap, Save, Copy } from 'lucide-react';
import { ModelConfig, MCPConfig, GeneratorOutput, SavedCreation, LorebookEntry } from '../types';
import { runMcpPipeline } from '../services/aiService';
import { generateTitleFromNarrative, generateId } from '../utils';
import { InteractivePlayer } from './InteractivePlayer';

interface GeneratorViewProps {
  models: ModelConfig[];
  mcps: MCPConfig[];
  lorebook: LorebookEntry[];
  onSaveCreation: (creation: SavedCreation) => void;
}

export function GeneratorView({ models, mcps, lorebook, onSaveCreation }: GeneratorViewProps) {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [selectedMcpId, setSelectedMcpId] = useState(mcps[0]?.id || '');
  const [output, setOutput] = useState<GeneratorOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [activeTab, setActiveTab] = useState<'narrative' | 'visual' | 'code'>('narrative');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedMcpId) return;

    const selectedMcp = mcps.find(m => m.id === selectedMcpId);
    if (!selectedMcp) return;

    setIsGenerating(true);
    setCurrentStep('準備生成...');

    try {
      let imageDescription = '';
      if (image) {
        imageDescription = `上傳的圖片: ${image.name}`;
      }

      const result = await runMcpPipeline(
        selectedMcp,
        models,
        { prompt, imageDescription },
        lorebook
      );

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
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              創意想法
            </label>
            <textarea
              placeholder="輸入您的創意想法..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                參考圖片 (可選)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  id="image-upload"
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Upload size={20} />
                  {image ? `已選擇: ${image.name}` : '上傳圖片'}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                創意管線
              </label>
              <select
                value={selectedMcpId}
                onChange={(e) => setSelectedMcpId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {mcps.map(mcp => (
                  <option key={mcp.id} value={mcp.id}>{mcp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            <Zap size={20} />
            {isGenerating ? currentStep : '啟動引擎'}
          </button>
        </div>
      </div>

      {output && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex border-b border-slate-700">
            {[
              { key: 'narrative', label: '文字輸出', icon: '📝' },
              { key: 'visual', label: '互動播放', icon: '🎬' },
              { key: 'code', label: '程式輸出', icon: '💻' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-700/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/20'
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
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    複製
                  </button>
                </div>
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                  <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
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
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    複製
                  </button>
                </div>
                <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 font-mono text-sm">
                    {output.code}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 p-4">
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
