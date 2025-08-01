import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, Share2, Play, Upload, ExternalLink, MessageCircle, Monitor, Search, Grid, List } from 'lucide-react';
import { SavedCreation } from '../types';
import { CreationDetailView } from './CreationDetailView';

interface CreationLibraryViewProps {
  creations: SavedCreation[];
  onBack: () => void;
  onPlay: (storyGraph: any) => void;
  onUpdate: (creation: SavedCreation) => void;
  onDelete: (id: string) => void;
  onUpload: (projectData: any) => void;
}

export function CreationLibraryView({ 
  creations, 
  onBack, 
  onPlay, 
  onUpdate, 
  onDelete, 
  onUpload 
}: CreationLibraryViewProps) {
  const [selectedCreation, setSelectedCreation] = useState<SavedCreation | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCreations = creations.filter(creation =>
    creation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creation.output.narrative.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUploadProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target?.result as string);
          onUpload(projectData);
          alert('專案上傳成功！');
        } catch (error) {
          alert('無效的專案檔案格式');
        }
      };
      reader.readAsText(file);
    } else {
      alert('請選擇有效的 JSON 專案檔案');
    }
  };

  const handleDownloadProject = (creation: SavedCreation) => {
    const projectData = {
      title: creation.title,
      created_at: creation.createdAt,
      id: creation.id,
      output: creation.output,
      version: '1.0.0'
    };

    const projectBlob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const projectUrl = URL.createObjectURL(projectBlob);
    const projectLink = document.createElement('a');
    projectLink.href = projectUrl;
    projectLink.download = `${creation.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_project.json`;
    projectLink.click();
    URL.revokeObjectURL(projectUrl);

    const narrativeBlob = new Blob([creation.output.narrative], { type: 'text/plain; charset=utf-8' });
    const narrativeUrl = URL.createObjectURL(narrativeBlob);
    const narrativeLink = document.createElement('a');
    narrativeLink.href = narrativeUrl;
    narrativeLink.download = `${creation.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_narrative.txt`;
    narrativeLink.click();
    URL.revokeObjectURL(narrativeUrl);

    const codeBlob = new Blob([creation.output.code], { type: 'text/javascript; charset=utf-8' });
    const codeUrl = URL.createObjectURL(codeBlob);
    const codeLink = document.createElement('a');
    codeLink.href = codeUrl;
    codeLink.download = `${creation.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_code.js`;
    codeLink.click();
    URL.revokeObjectURL(codeUrl);

    const storyGraphBlob = new Blob([JSON.stringify(creation.output.storyGraph, null, 2)], { type: 'application/json' });
    const storyGraphUrl = URL.createObjectURL(storyGraphBlob);
    const storyGraphLink = document.createElement('a');
    storyGraphLink.href = storyGraphUrl;
    storyGraphLink.download = `${creation.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_story-graph.json`;
    storyGraphLink.click();
    URL.revokeObjectURL(storyGraphUrl);
  };

  const handleShare = (creation: SavedCreation, type: string) => {
    const shareData = {
      title: creation.title,
      text: creation.output.narrative.substring(0, 200) + '...',
      url: window.location.href
    };

    switch (type) {
      case 'web':
        if (navigator.share) {
          navigator.share(shareData);
        } else {
          navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`);
          alert('分享內容已複製到剪貼板');
        }
        break;
      case 'interactive':
        onPlay(creation.output.storyGraph);
        break;
      case 'social':
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.title + ' - ' + shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        window.open(twitterUrl, '_blank');
        break;
      case 'message':
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.title + '\n\n' + shareData.text + '\n\n' + shareData.url)}`;
        window.open(whatsappUrl, '_blank');
        break;
    }
    setShowShareMenu(null);
  };

  if (selectedCreation) {
    return (
      <CreationDetailView
        creation={selectedCreation}
        onBack={() => setSelectedCreation(null)}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-stone-800">創作庫</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleUploadProject}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Upload size={16} />
            上傳專案
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder="搜尋創作..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-100 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCreations.map(creation => (
            <div key={creation.id} className="bg-stone-200/50 border border-stone-300 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-amber-400 to-orange-500 relative">
                <img
                  src={creation.thumbnailUrl || '/placeholder-image.jpg'}
                  alt={creation.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjOUI5QjlCIi8+Cjwvdmc+';
                  }}
                />
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-stone-800 mb-2 truncate">{creation.title}</h3>
                <p className="text-sm text-stone-600 mb-3">
                  {new Date(creation.createdAt).toLocaleDateString('zh-TW')}
                </p>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCreation(creation)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    開啟專案
                  </button>
                  
                  <button
                    onClick={() => onPlay(creation.output.storyGraph)}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title="播放"
                  >
                    <Play size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDownloadProject(creation)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="下載專案"
                  >
                    <Download size={16} />
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(showShareMenu === creation.id ? null : creation.id)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      title="分享專案"
                    >
                      <Share2 size={16} />
                    </button>
                    
                    {showShareMenu === creation.id && (
                      <div className="absolute top-full right-0 mt-2 bg-white border border-stone-300 rounded-lg shadow-lg z-10 min-w-48">
                        <button
                          onClick={() => handleShare(creation, 'web')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <ExternalLink size={16} />
                          網路分享
                        </button>
                        <button
                          onClick={() => handleShare(creation, 'social')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <Share2 size={16} />
                          社交媒體
                        </button>
                        <button
                          onClick={() => handleShare(creation, 'message')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <MessageCircle size={16} />
                          通信軟體
                        </button>
                        <button
                          onClick={() => handleShare(creation, 'interactive')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <Monitor size={16} />
                          交互視窗
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCreations.map(creation => (
            <div key={creation.id} className="bg-stone-200/50 border border-stone-300 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-800 mb-1">{creation.title}</h3>
                  <p className="text-sm text-stone-600">
                    {new Date(creation.createdAt).toLocaleDateString('zh-TW')} • {creation.output.narrative.length} 字
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCreation(creation)}
                    className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    開啟專案
                  </button>
                  
                  <button
                    onClick={() => onPlay(creation.output.storyGraph)}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title="播放"
                  >
                    <Play size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDownloadProject(creation)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="下載專案"
                  >
                    <Download size={16} />
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(showShareMenu === creation.id ? null : creation.id)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      title="分享專案"
                    >
                      <Share2 size={16} />
                    </button>
                    
                    {showShareMenu === creation.id && (
                      <div className="absolute top-full right-0 mt-2 bg-white border border-stone-300 rounded-lg shadow-lg z-10 min-w-48">
                        <button
                          onClick={() => handleShare(creation, 'web')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <ExternalLink size={16} />
                          網路分享
                        </button>
                        <button
                          onClick={() => handleShare(creation, 'social')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <Share2 size={16} />
                          社交媒體
                        </button>
                        <button
                          onClick={() => handleShare(creation, 'message')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <MessageCircle size={16} />
                          通信軟體
                        </button>
                        <button
                          onClick={() => handleShare(creation, 'interactive')}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-stone-100 transition-colors"
                        >
                          <Monitor size={16} />
                          交互視窗
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredCreations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-stone-500 text-lg">
            {searchTerm ? '沒有找到符合條件的創作' : '還沒有任何創作'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleUploadProject}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              上傳第一個專案
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}
