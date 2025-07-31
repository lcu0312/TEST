import React, { useState } from 'react';
import { X, Plus, Trash2, Edit } from 'lucide-react';
import { ModelConfig, MCPConfig, MCPStep, LorebookEntry } from '../types';
import { generateId, LOREBOOK_CATEGORIES } from '../utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelConfigs: ModelConfig[];
  setModelConfigs: (configs: ModelConfig[]) => void;
  mcps: MCPConfig[];
  setMcps: (mcps: MCPConfig[]) => void;
  lorebook: LorebookEntry[];
  setLorebook: (entries: LorebookEntry[]) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  modelConfigs,
  setModelConfigs,
  mcps,
  setMcps,
  lorebook,
  setLorebook
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'mcp' | 'lorebook'>('models');
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [editingMcp, setEditingMcp] = useState<MCPConfig | null>(null);
  const [editingLorebook, setEditingLorebook] = useState<LorebookEntry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(LOREBOOK_CATEGORIES[0]);

  if (!isOpen) return null;

  const handleSaveModel = (model: ModelConfig) => {
    if (editingModel?.id) {
      setModelConfigs(modelConfigs.map(m => m.id === model.id ? model : m));
    } else {
      setModelConfigs([...modelConfigs, { ...model, id: generateId() }]);
    }
    setEditingModel(null);
  };

  const handleDeleteModel = (id: string) => {
    setModelConfigs(modelConfigs.filter(m => m.id !== id));
  };

  const handleSaveMcp = (mcp: MCPConfig) => {
    if (editingMcp?.id) {
      setMcps(mcps.map(m => m.id === mcp.id ? mcp : m));
    } else {
      setMcps([...mcps, { ...mcp, id: generateId() }]);
    }
    setEditingMcp(null);
  };

  const handleDeleteMcp = (id: string) => {
    setMcps(mcps.filter(m => m.id !== id));
  };

  const handleSaveLorebook = (entry: LorebookEntry) => {
    if (editingLorebook?.id) {
      setLorebook(lorebook.map(e => e.id === entry.id ? entry : e));
    } else {
      setLorebook([...lorebook, { ...entry, id: generateId() }]);
    }
    setEditingLorebook(null);
  };

  const handleDeleteLorebook = (id: string) => {
    setLorebook(lorebook.filter(e => e.id !== id));
  };

  const filteredLorebook = lorebook.filter(entry => entry.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">設定</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          {[
            { key: 'models', label: 'AI 模型' },
            { key: 'mcp', label: 'MCP 設定' },
            { key: 'lorebook', label: '世界觀資料庫' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'models' && (
            <ModelConfigTab
              configs={modelConfigs}
              editingModel={editingModel}
              setEditingModel={setEditingModel}
              onSave={handleSaveModel}
              onDelete={handleDeleteModel}
            />
          )}

          {activeTab === 'mcp' && (
            <McpConfigTab
              mcps={mcps}
              models={modelConfigs}
              editingMcp={editingMcp}
              setEditingMcp={setEditingMcp}
              onSave={handleSaveMcp}
              onDelete={handleDeleteMcp}
            />
          )}

          {activeTab === 'lorebook' && (
            <LorebookTab
              entries={filteredLorebook}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              editingEntry={editingLorebook}
              setEditingEntry={setEditingLorebook}
              onSave={handleSaveLorebook}
              onDelete={handleDeleteLorebook}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ModelConfigTab({
  configs,
  editingModel,
  setEditingModel,
  onSave,
  onDelete
}: {
  configs: ModelConfig[];
  editingModel: ModelConfig | null;
  setEditingModel: (model: ModelConfig | null) => void;
  onSave: (model: ModelConfig) => void;
  onDelete: (id: string) => void;
}) {
  const [formData, setFormData] = useState<Partial<ModelConfig>>({});

  const handleEdit = (model: ModelConfig) => {
    setEditingModel(model);
    setFormData(model);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.provider && formData.apiKey) {
      onSave(formData as ModelConfig);
      setFormData({});
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">已配置的模型</h3>
          <button
            onClick={() => {setEditingModel(null); setFormData({});}}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            新增
          </button>
        </div>
        
        <div className="space-y-3">
          {configs.map(config => (
            <div key={config.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">{config.name}</h4>
                  <p className="text-sm text-slate-400">{config.provider}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(config.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          {editingModel ? '編輯模型' : '新增模型'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="模型名稱"
            value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          
          <select
            value={formData.provider || ''}
            onChange={e => setFormData({...formData, provider: e.target.value as 'google' | 'ollama'})}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="">選擇提供商</option>
            <option value="google">Google</option>
            <option value="ollama">Ollama</option>
          </select>

          <input
            type="text"
            placeholder="API Key"
            value={formData.apiKey || ''}
            onChange={e => setFormData({...formData, apiKey: e.target.value})}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />

          {formData.provider === 'ollama' && (
            <>
              <input
                type="text"
                placeholder="Base URL (例如: http://localhost:11434)"
                value={formData.baseUrl || ''}
                onChange={e => setFormData({...formData, baseUrl: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                placeholder="模型名稱 (例如: llama2)"
                value={formData.model || ''}
                onChange={e => setFormData({...formData, model: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </>
          )}

          <div className="flex gap-3">
            <button 
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              儲存
            </button>
            <button 
              type="button" 
              onClick={() => {setEditingModel(null); setFormData({});}}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function McpConfigTab({
  mcps,
  models,
  editingMcp,
  setEditingMcp,
  onSave,
  onDelete
}: {
  mcps: MCPConfig[];
  models: ModelConfig[];
  editingMcp: MCPConfig | null;
  setEditingMcp: (mcp: MCPConfig | null) => void;
  onSave: (mcp: MCPConfig) => void;
  onDelete: (id: string) => void;
}) {
  const [formData, setFormData] = useState<Partial<MCPConfig>>({});

  const handleEdit = (mcp: MCPConfig) => {
    setEditingMcp(mcp);
    setFormData(mcp);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.steps?.length) {
      onSave(formData as MCPConfig);
      setFormData({});
    }
  };

  const addStep = () => {
    const newStep: MCPStep = {
      id: generateId(),
      name: '',
      modelId: models[0]?.id || '',
      promptTemplate: ''
    };
    setFormData({
      ...formData,
      steps: [...(formData.steps || []), newStep]
    });
  };

  const updateStep = (index: number, step: MCPStep) => {
    const steps = [...(formData.steps || [])];
    steps[index] = step;
    setFormData({...formData, steps});
  };

  const removeStep = (index: number) => {
    const steps = [...(formData.steps || [])];
    steps.splice(index, 1);
    setFormData({...formData, steps});
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">已配置的 MCP</h3>
          <button
            onClick={() => {setEditingMcp(null); setFormData({});}}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            新增
          </button>
        </div>
        
        <div className="space-y-3">
          {mcps.map(mcp => (
            <div key={mcp.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">{mcp.name}</h4>
                  <p className="text-sm text-slate-400">{mcp.steps.length} 個步驟</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(mcp)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(mcp.id)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          {editingMcp ? '編輯 MCP' : '新增 MCP'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="MCP 名稱"
            value={formData.name || ''}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-white">步驟</h4>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-2 px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
              >
                <Plus size={14} />
                新增步驟
              </button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {(formData.steps || []).map((step, index) => (
                <div key={step.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">步驟 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="步驟名稱"
                    value={step.name}
                    onChange={e => updateStep(index, {...step, name: e.target.value})}
                    className="w-full px-3 py-2 mb-2 bg-slate-600/50 border border-slate-500 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  
                  <select
                    value={step.modelId}
                    onChange={e => updateStep(index, {...step, modelId: e.target.value})}
                    className="w-full px-3 py-2 mb-2 bg-slate-600/50 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {models.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>

                  <textarea
                    placeholder="Prompt 範本"
                    value={step.promptTemplate}
                    onChange={e => updateStep(index, {...step, promptTemplate: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              儲存
            </button>
            <button 
              type="button" 
              onClick={() => {setEditingMcp(null); setFormData({});}}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LorebookTab({
  entries,
  selectedCategory,
  setSelectedCategory,
  editingEntry,
  setEditingEntry,
  onSave,
  onDelete
}: {
  entries: LorebookEntry[];
  selectedCategory: string;
  setSelectedCategory: (category: typeof LOREBOOK_CATEGORIES[number]) => void;
  editingEntry: LorebookEntry | null;
  setEditingEntry: (entry: LorebookEntry | null) => void;
  onSave: (entry: LorebookEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [formData, setFormData] = useState<Partial<LorebookEntry>>({});

  const handleEdit = (entry: LorebookEntry) => {
    setEditingEntry(entry);
    setFormData(entry);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.keyword && formData.description) {
      onSave({
        ...formData,
        category: selectedCategory
      } as LorebookEntry);
      setFormData({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {LOREBOOK_CATEGORIES.map(category => (
          <button
            key={category}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{selectedCategory} 條目</h3>
            <button
              onClick={() => {setEditingEntry(null); setFormData({});}}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              新增
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {entries.map(entry => (
              <div key={entry.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-white mb-1">{entry.keyword}</h4>
                    <p className="text-sm text-slate-400 line-clamp-2">{entry.description}</p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingEntry ? '編輯條目' : '新增條目'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="關鍵詞"
              value={formData.keyword || ''}
              onChange={e => setFormData({...formData, keyword: e.target.value})}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            
            <textarea
              placeholder="描述"
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={6}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              required
            />

            <div className="flex gap-3">
              <button 
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                儲存
              </button>
              <button 
                type="button" 
                onClick={() => {setEditingEntry(null); setFormData({});}}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
