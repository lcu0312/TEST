import { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { StoryGraph } from '../types';

interface InteractivePlayerProps {
  storyGraph: StoryGraph;
}

export function InteractivePlayer({ storyGraph }: InteractivePlayerProps) {
  const [currentNodeId, setCurrentNodeId] = useState(storyGraph.startNodeId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const currentNode = storyGraph.nodes.find(node => node.id === currentNodeId);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, [currentNodeId]);

  const handleChoice = (nextNodeId: string) => {
    setCurrentNodeId(nextNodeId);
    setIsPlaying(false);
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  };

  const handlePlay = () => {
    if (!currentNode) return;
    
    setIsPlaying(true);
    
    if (!isMuted && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentNode.narration);
      utterance.lang = 'zh-TW';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlaying(false), Math.max(3000, currentNode.narration.length * 50));
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  };

  const handleRestart = () => {
    setCurrentNodeId(storyGraph.startNodeId);
    setIsPlaying(false);
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  };

  if (!currentNode) {
    return (
      <div className="bg-slate-900/50 border border-slate-600 rounded-xl p-8 text-center">
        <div className="text-red-400 mb-4">⚠️ 故事節點未找到</div>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <RotateCcw size={16} />
          重新開始
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-600 rounded-xl overflow-hidden">
      {/* Scene Display */}
      <div className="relative aspect-video bg-slate-800">
        {currentNode.imageUrl ? (
          <img 
            src={currentNode.imageUrl} 
            alt="場景圖片" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎭</span>
              </div>
              <p className="text-slate-400">場景圖片生成中...</p>
            </div>
          </div>
        )}
        
        {/* Subtitle Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white text-lg font-medium text-center">
            {currentNode.subtitle}
          </p>
        </div>
      </div>

      {/* Player Controls */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={isPlaying ? handleStop : handlePlay}
              className="flex items-center justify-center w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex items-center justify-center w-10 h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            重新開始
          </button>
        </div>

        {/* Narration Text */}
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 mb-4">
          <p className="text-slate-300 leading-relaxed">
            {currentNode.narration}
          </p>
        </div>

        {/* Choice Buttons */}
        {!isPlaying && currentNode.choices.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400 mb-3">選擇您的行動：</p>
            <div className="grid gap-2">
              {currentNode.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleChoice(choice.nextNodeId)}
                  className="w-full p-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 hover:border-slate-500 text-white text-left rounded-lg transition-all duration-200 hover:transform hover:scale-[1.02]"
                >
                  <span className="text-purple-400 font-medium mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {choice.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Story End */}
        {currentNode.choices.length === 0 && !isPlaying && (
          <div className="text-center py-6">
            <div className="text-2xl mb-4">🎭</div>
            <p className="text-lg font-medium text-white mb-4">故事結束</p>
            <p className="text-slate-400 mb-6">感謝您的參與，希望您喜歡這個故事！</p>
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              <RotateCcw size={18} />
              重新開始
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
