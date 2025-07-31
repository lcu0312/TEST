import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, Volume2, Share2, Settings, Zap, Users } from 'lucide-react';
import { ModelConfig, ChatMessage, FileAnalysis, MultiAIWorkflow } from '../types';
import { sendChatMessage, analyzeFile, createDefaultWorkflow } from '../services/aiService';
import { generateId } from '../utils';

interface ChatViewProps {
  models: ModelConfig[];
}

export function ChatView({ models }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [fileAnalyses, setFileAnalyses] = useState<FileAnalysis[]>([]);
  const [enableMultiAI, setEnableMultiAI] = useState(false);
  const [selectedOutputModel, setSelectedOutputModel] = useState(models[0]?.id || '');
  const [currentWorkflow, setCurrentWorkflow] = useState<MultiAIWorkflow | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
      setSelectedOutputModel(models[0].id);
    }
  }, [models, selectedModelId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    
    const analyses: FileAnalysis[] = [];
    for (const file of files) {
      try {
        const analysis = await analyzeFile(file, models);
        analyses.push(analysis);
      } catch (error) {
        console.error('File analysis failed:', error);
      }
    }
    setFileAnalyses(prev => [...prev, ...analyses]);
    
    if (enableMultiAI && files.length > 0) {
      const workflow = createDefaultWorkflow(files, models);
      setCurrentWorkflow(workflow);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setFileAnalyses(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachments(prev => [...prev, audioFile]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('無法開始錄音，請檢查麥克風權限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() && attachments.length === 0) return;
    if (!selectedModelId) {
      alert('請先在設定中配置 AI 模型');
      return;
    }

    const selectedModel = models.find(m => m.id === selectedModelId);
    if (!selectedModel) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      fileAnalysis: fileAnalyses.length > 0 ? [...fileAnalyses] : undefined,
      workflow: currentWorkflow || undefined,
      selectedOutputModel: enableMultiAI ? selectedOutputModel : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setAttachments([]);
    setFileAnalyses([]);
    setCurrentWorkflow(null);
    setIsSending(true);

    try {
      const response = await sendChatMessage(
        enableMultiAI && selectedOutputModel ? models.find(m => m.id === selectedOutputModel) || selectedModel : selectedModel, 
        inputMessage, 
        attachments,
        currentWorkflow || undefined,
        enableMultiAI ? models : []
      );
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '抱歉，發送訊息時發生錯誤。請檢查網路連接和 AI 模型設定。',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const speakMessage = (content: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = 'zh-TW';
      speechSynthesis.speak(utterance);
    }
  };

  const shareMessage = (content: string) => {
    if (navigator.share) {
      navigator.share({
        title: '幻影引擎對話',
        text: content
      });
    } else {
      navigator.clipboard.writeText(content);
      alert('已複製到剪貼板');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Model Selection and AI Collaboration Controls */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-300">AI 模型：</label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            <Settings size={16} />
            高級選項
          </button>
        </div>

        {showAdvancedOptions && (
          <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={enableMultiAI}
                  onChange={(e) => setEnableMultiAI(e.target.checked)}
                  className="rounded border-slate-500 bg-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <Users size={16} />
                啟用多 AI 協作
              </label>
            </div>
            
            {enableMultiAI && (
              <div className="flex items-center gap-4 pl-6">
                <label className="text-sm font-medium text-slate-300">輸出模型：</label>
                <select
                  value={selectedOutputModel}
                  onChange={(e) => setSelectedOutputModel(e.target.value)}
                  className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-white mb-2">開始對話</h3>
            <p className="text-slate-400">與 AI 助手開始您的創意對話</p>
          </div>
        )}

        {messages.map(message => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            onSpeak={speakMessage}
            onShare={shareMessage}
            models={models}
          />
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-slate-700/50 border border-slate-600 rounded-2xl rounded-bl-md p-4 max-w-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm">AI 正在思考...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-slate-800/50 border-t border-slate-700 p-4">
        {/* Attachments with AI Analysis */}
        {attachments.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => {
                const analysis = fileAnalyses[index];
                return (
                  <div key={index} className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 min-w-48">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300 truncate max-w-32">
                        {file.name}
                      </span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-slate-400 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                    
                    {analysis && (
                      <div className="text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <Zap size={12} />
                          <span>類型: {analysis.contentType}</span>
                        </div>
                        {analysis.suggestedModels.length > 0 && (
                          <div>建議模型: {analysis.suggestedModels.slice(0, 2).map((id: string) => models.find((m: ModelConfig) => m.id === id)?.name).filter(Boolean).join(', ')}</div>
                        )}
                        <div className="text-green-400">信心度: {(analysis.confidence * 100).toFixed(0)}%</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {enableMultiAI && currentWorkflow && (
              <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-purple-300 mb-2">
                  <Users size={16} />
                  <span className="text-sm font-medium">多 AI 協作工作流程</span>
                </div>
                <div className="text-xs text-slate-400">
                  {currentWorkflow.tasks.length} 個任務 • 協調模型: {models.find(m => m.id === currentWorkflow.coordinatorModelId)?.name}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="輸入訊息... (Shift+Enter 換行)"
              rows={1}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.txt,.doc,.docx,.pdf,.md,.json,.csv,.xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              <Paperclip size={20} />
            </button>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button
              onClick={handleSend}
              disabled={(!inputMessage.trim() && attachments.length === 0) || isSending}
              className="flex items-center justify-center w-12 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessageBubble({ 
  message, 
  onSpeak, 
  onShare,
  models
}: { 
  message: ChatMessage;
  onSpeak: (content: string) => void;
  onShare: (content: string) => void;
  models: ModelConfig[];
}) {
  const isUser = message.role === 'user';

  const renderFileAttachment = (file: File, analysis?: FileAnalysis) => {
    const fileUrl = URL.createObjectURL(file);
    
    if (file.type.startsWith('image/')) {
      return (
        <div className="space-y-2">
          <img 
            src={fileUrl} 
            alt={file.name}
            className="max-w-xs max-h-48 rounded-lg object-cover"
            onLoad={() => URL.revokeObjectURL(fileUrl)}
          />
          {analysis && (
            <div className="text-xs text-slate-400 bg-slate-800/50 rounded px-2 py-1">
              AI 分析: {analysis.contentType} • 信心度 {(analysis.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      );
    } else if (file.type.startsWith('video/')) {
      return (
        <div className="space-y-2">
          <video 
            src={fileUrl} 
            controls 
            className="max-w-xs max-h-48 rounded-lg"
            onLoadedData={() => URL.revokeObjectURL(fileUrl)}
          />
          {analysis && (
            <div className="text-xs text-slate-400 bg-slate-800/50 rounded px-2 py-1">
              視頻分析: {(file.size / 1024 / 1024).toFixed(2)}MB • 建議模型: {analysis.suggestedModels.slice(0, 1).map((id: string) => models.find((m: ModelConfig) => m.id === id)?.name).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      );
    } else if (file.type.startsWith('audio/')) {
      return (
        <div className="space-y-2">
          <audio 
            src={fileUrl} 
            controls 
            className="max-w-xs"
            onLoadedData={() => URL.revokeObjectURL(fileUrl)}
          />
          {analysis && (
            <div className="text-xs text-slate-400 bg-slate-800/50 rounded px-2 py-1">
              音頻分析: {(file.size / 1024 / 1024).toFixed(2)}MB • 建議模型: {analysis.suggestedModels.slice(0, 1).map((id: string) => models.find((m: ModelConfig) => m.id === id)?.name).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      );
    } else {
      URL.revokeObjectURL(fileUrl);
      return (
        <div className="space-y-2">
          <div className="bg-slate-600/50 border border-slate-500 rounded-lg px-3 py-2">
            <span className="text-sm text-slate-300">{file.name}</span>
            <div className="text-xs text-slate-400 mt-1">{file.type}</div>
          </div>
          {analysis && analysis.extractedContent && (
            <div className="text-xs text-slate-400 bg-slate-800/50 rounded px-2 py-1 max-w-xs">
              內容預覽: {analysis.extractedContent.substring(0, 100)}...
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-2xl p-4 ${
          isUser 
            ? 'bg-purple-600 text-white rounded-br-md' 
            : 'bg-slate-700/50 border border-slate-600 text-slate-100 rounded-bl-md'
        }`}>
          {message.content && (
            <p className="whitespace-pre-wrap leading-relaxed mb-2">
              {message.content}
            </p>
          )}
          
          {message.attachments && (
            <div className="space-y-2">
              {message.attachments.map((file, index) => (
                <div key={index}>
                  {renderFileAttachment(file, message.fileAnalysis?.[index])}
                </div>
              ))}
            </div>
          )}

          {message.workflow && (
            <div className="mt-3 bg-purple-900/20 border border-purple-600/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-300 mb-2">
                <Users size={14} />
                <span className="text-sm font-medium">多 AI 協作結果</span>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>工作流程: {message.workflow.name}</div>
                <div>任務數量: {message.workflow.tasks.length}</div>
                <div>狀態: {message.workflow.status === 'completed' ? '已完成' : message.workflow.status === 'processing' ? '處理中' : '等待中'}</div>
                {message.selectedOutputModel && (
                  <div>輸出模型: {models.find((m: ModelConfig) => m.id === message.selectedOutputModel)?.name || '未知模型'}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`flex items-center gap-2 mt-2 text-xs text-slate-400 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          
          {!isUser && (
            <>
              <button
                onClick={() => onSpeak(message.content)}
                className="p-1 hover:text-white transition-colors"
                title="朗讀"
              >
                <Volume2 size={14} />
              </button>
              <button
                onClick={() => onShare(message.content)}
                className="p-1 hover:text-white transition-colors"
                title="分享"
              >
                <Share2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
