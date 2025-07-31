import { useState } from 'react';
import { Search, Grid, List, Eye, Edit2, Trash2 } from 'lucide-react';
import { SavedCreation } from '../types';
import { CreationDetailView } from './CreationDetailView';

interface LibraryViewProps {
  creations: SavedCreation[];
  onUpdateCreation: (creation: SavedCreation) => void;
  onDeleteCreation: (id: string) => void;
}

export function LibraryView({ creations, onUpdateCreation, onDeleteCreation }: LibraryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCreation, setSelectedCreation] = useState<SavedCreation | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const filteredCreations = creations.filter(creation =>
    creation.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditTitle = (creation: SavedCreation) => {
    setEditingTitle(creation.id);
    setNewTitle(creation.title);
  };

  const handleSaveTitle = (creation: SavedCreation) => {
    if (newTitle.trim()) {
      onUpdateCreation({
        ...creation,
        title: newTitle.trim()
      });
    }
    setEditingTitle(null);
    setNewTitle('');
  };

  const handleCancelEdit = () => {
    setEditingTitle(null);
    setNewTitle('');
  };

  const handleDelete = (creation: SavedCreation) => {
    if (confirm(`確定要刪除「${creation.title}」嗎？`)) {
      onDeleteCreation(creation.id);
    }
  };

  if (selectedCreation) {
    return (
      <CreationDetailView
        creation={selectedCreation}
        onBack={() => setSelectedCreation(null)}
        onUpdate={onUpdateCreation}
        onDelete={onDeleteCreation}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">創作庫</h2>
          <p className="text-slate-400">管理您的創意作品</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="搜尋創作..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div className="flex bg-slate-700/50 border border-slate-600 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredCreations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchTerm ? '未找到匹配的創作' : '創作庫是空的'}
          </h3>
          <p className="text-slate-400">
            {searchTerm ? '嘗試使用不同的搜尋詞' : '開始創作您的第一個故事吧！'}
          </p>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredCreations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCreations.map(creation => (
            <div key={creation.id} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-all duration-200 group">
              {/* Thumbnail */}
              <div className="aspect-video bg-slate-700 relative overflow-hidden">
                {creation.thumbnailUrl ? (
                  <img 
                    src={creation.thumbnailUrl} 
                    alt={creation.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl">🎭</span>
                  </div>
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setSelectedCreation(creation)}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    onClick={() => handleEditTitle(creation)}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(creation)}
                    className="p-2 bg-red-500/20 backdrop-blur-sm rounded-full text-white hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {editingTitle === creation.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveTitle(creation)}
                        className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                      >
                        儲存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">
                      {creation.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {new Date(creation.createdAt).toLocaleDateString('zh-TW')}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredCreations.length > 0 && (
        <div className="space-y-3">
          {filteredCreations.map(creation => (
            <div key={creation.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                  {creation.thumbnailUrl ? (
                    <img 
                      src={creation.thumbnailUrl} 
                      alt={creation.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl">🎭</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingTitle === creation.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveTitle(creation)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                        >
                          儲存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold text-white mb-1 truncate">
                        {creation.title}
                      </h3>
                      <p className="text-sm text-slate-400">
                        建立於 {new Date(creation.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedCreation(creation)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="檢視"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleEditTitle(creation)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                    title="編輯標題"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(creation)}
                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    title="刪除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
