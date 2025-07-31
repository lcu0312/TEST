import { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Copy, Download } from 'lucide-react';
import { SavedCreation, OutputTab } from '../types';
import { InteractivePlayer } from './InteractivePlayer';

interface CreationDetailViewProps {
  creation: SavedCreation;
  onBack: () => void;
  onUpdate: (creation: SavedCreation) => void;
  onDelete: (id: string) => void;
}

export function CreationDetailView({ creation, onBack, onUpdate, onDelete }: CreationDetailViewProps) {
  const [activeTab, setActiveTab] = useState<OutputTab>('visual');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(creation.title);

  const handleSaveTitle = () => {
    if (newTitle.trim()) {
      onUpdate({
        ...creation,
        title: newTitle.trim()
      });
    }
    setIsEditingTitle(false);
  };

  const handleDelete = () => {
    if (confirm(`確定要刪除「${creation.title}」嗎？`)) {
      onDelete(creation.id);
      onBack();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已複製到剪貼板！');
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-2xl font-bold bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full max-w-2xl"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveTitle}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    儲存
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTitle(false);
                      setNewTitle(creation.title);
                    }}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white mb-2">{creation.title}</h1>
                <p className="text-slate-400">
                  建立於 {new Date(creation.createdAt).toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditingTitle(true)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="編輯標題"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
            title="刪除創作"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
        {/* Tabs */}
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
              onClick={() => setActiveTab(tab.key as OutputTab)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'narrative' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">故事敘述</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(creation.output.narrative)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    複製
                  </button>
                  <button
                    onClick={() => downloadAsFile(creation.output.narrative, `${creation.title}-故事.txt`)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    下載
                  </button>
                </div>
              </div>
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {creation.output.narrative}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'visual' && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">互動故事播放</h3>
              <InteractivePlayer storyGraph={creation.output.storyGraph} />
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">程式碼輸出</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(creation.output.code)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Copy size={16} />
                    複製
                  </button>
                  <button
                    onClick={() => downloadAsFile(creation.output.code, `${creation.title}-程式碼.json`)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    下載
                  </button>
                </div>
              </div>
              <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-green-400 font-mono text-sm">
                  {creation.output.code}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
