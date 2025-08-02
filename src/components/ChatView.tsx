import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, Volume2, Share2, Settings, Zap, Users, Download, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { ModelConfig, ChatMessage, FileAnalysis, MultiAIWorkflow, Conversation } from '../types';
import { analyzeFile, createDefaultWorkflow } from '../services/aiService';
import { generateId } from '../utils';
import { useConversations } from '../hooks/useApiData';
import apiService from '../services/apiService';

interface ChatViewProps {
  models: ModelConfig[];
  userId?: string;
}

export function ChatView({ models, userId }: ChatViewProps) {
  void userId;
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { data: conversations, createConversation, updateConversation, deleteConversation: deleteConversationApi } = useConversations([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const currentMessages = currentConversation?.messages || messages;
  
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

    updateConversationMessages([...currentMessages, userMessage]);
    setInputMessage('');
    setAttachments([]);
    setFileAnalyses([]);
    setCurrentWorkflow(null);
    setIsSending(true);

    try {
      const result = await apiService.sendChatMessage({
        message: inputMessage,
        conversationId: currentConversationId ?? undefined
      });

      const assistantMessage: ChatMessage = {
        id: result.message_id || generateId(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...currentMessages, userMessage, assistantMessage];
      updateConversationMessages(updatedMessages);
      
      if (result.conversation_id && !currentConversationId) {
        setCurrentConversationId(result.conversation_id);
        
        const newConversation: Conversation = {
          id: result.conversation_id,
          title: inputMessage.length > 30 ? inputMessage.substring(0, 30) + '...' : inputMessage,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: updatedMessages,
          userId: userId || 'default_user'
        };
        
        try {
          await createConversation(newConversation);
        } catch (convError) {
          console.error('Failed to create conversation record:', convError);
        }
      } else if (currentConversationId) {
        const existingConversation = conversations.find(c => c.id === currentConversationId);
        if (existingConversation) {
          const updatedConversation: Conversation = {
            ...existingConversation,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          };
          
          try {
            await updateConversation(currentConversationId, updatedConversation);
          } catch (updateError) {
            console.error('Failed to update conversation:', updateError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorText = error instanceof Error ? error.message : String(error);
      
      let assistantContent = '抱歉，發送訊息時發生錯誤。請檢查網路連接和 AI 模型設定。';
      
      if (errorText.includes('Authentication') || errorText.includes('Configuration')) {
        assistantContent = '檢測到系統配置問題，正在啟動元級糾錯協議進行診斷...';
        
        try {
          const correctionStatus = await apiService.getMetaCorrectionStatus();
          if (correctionStatus && correctionStatus.has_pending_correction) {
            assistantContent += '\n\n系統已生成修復策略報告，請查看並批准執行。';
          }
        } catch (statusError) {
          console.error('Failed to check correction status:', statusError);
        }
      }
      
      const assistantErrorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      };
      updateConversationMessages([...currentMessages, userMessage, assistantErrorMessage]);
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

  const downloadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportChatHistory = () => {
    const chatData = {
      exportDate: new Date().toISOString(),
      totalMessages: currentMessages.length,
      messages: currentMessages.map(msg => ({
        ...msg,
        attachments: msg.attachments?.map(file => ({
          name: file.name,
          type: file.type,
          size: file.size
        }))
      }))
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const createNewConversation = async () => {
    try {
      const newConversation: Conversation = {
        id: generateId(),
        title: `新對話 ${conversations.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        userId: userId || 'default_user'
      };
      
      await createConversation(newConversation);
      setCurrentConversationId(newConversation.id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationApi(conversationId);
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const updateConversationMessages = async (newMessages: ChatMessage[]) => {
    if (currentConversationId) {
      try {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (conversation) {
          const updatedConversation = {
            ...conversation,
            messages: newMessages,
            updatedAt: new Date().toISOString()
          };
          await updateConversation(currentConversationId, updatedConversation);
        }
      } catch (error) {
        console.error('Failed to update conversation:', error);
      }
    }
    setMessages(newMessages);
  };

  const selectConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">
      {/* Collapsible Sidebar */}
      <div className={`${isCollapsed ? 'w-12' : 'w-64'} transition-all duration-300 bg-stone-200 border-r border-stone-300 flex flex-col resize-x overflow-auto`}>
        <div className="p-3 border-b border-stone-300 flex items-center justify-between">
          {!isCollapsed && <h3 className="font-medium text-stone-700">對話記錄</h3>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-stone-500 hover:text-stone-700 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        {!isCollapsed && (
          <div className="flex-1 flex flex-col p-3">
            <button
              onClick={createNewConversation}
              className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mb-3"
            >
              <Plus size={14} />
              新增對話
            </button>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {conversations.map(conversation => (
                <div
                  key={conversation.id}
                  className={`p-2 rounded-lg cursor-pointer transition-colors group ${
                    currentConversationId === conversation.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                  onClick={() => selectConversation(conversation.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {conversation.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {conversation.messages.length} 則訊息
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={exportChatHistory}
              className="w-full px-3 py-2 bg-stone-600 hover:bg-stone-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download size={14} />
              匯出對話記錄
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-96">
        {/* Header */}
        <div className="bg-stone-200/50 border-b border-stone-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-800">智能對話</h2>
              <p className="text-sm text-stone-600">與 AI 進行多模態對話</p>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className={`p-2 rounded-lg transition-colors ${
                  showAdvancedOptions 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-stone-300 hover:bg-stone-400 text-stone-700'
                }`}
                title="進階選項"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {showAdvancedOptions && (
            <div className="mt-4 p-4 bg-stone-100 border border-stone-300 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={enableMultiAI}
                    onChange={(e) => setEnableMultiAI(e.target.checked)}
                    className="rounded border-stone-400 bg-white text-amber-600 focus:ring-amber-500"
                  />
                  啟用多 AI 協作
                </label>
              </div>
              
              {enableMultiAI && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-600 mb-1">輸出模型</label>
                    <select
                      value={selectedOutputModel}
                      onChange={(e) => setSelectedOutputModel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded text-stone-800 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      {models.map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>
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
              <h3 className="text-xl font-semibold text-stone-800 mb-2">開始對話</h3>
              <p className="text-stone-600">與 AI 助手開始您的創意對話</p>
            </div>
          )}

          {currentMessages.map(message => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              onSpeak={speakMessage}
              onShare={shareMessage}
              onDownload={downloadFile}
              models={models}
            />
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-stone-200 border border-stone-300 rounded-2xl rounded-bl-md p-4 max-w-xs">
                <div className="flex items-center gap-2 text-stone-600">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-stone-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-stone-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-stone-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm">AI 正在思考...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-stone-200/50 border-t border-stone-300 p-4">
          {attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => {
                  const analysis = fileAnalyses[index];
                  return (
                    <div key={index} className="bg-white border border-stone-300 rounded-lg p-3 min-w-48">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-stone-700 truncate max-w-32">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-stone-500 hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                      
                      {analysis && (
                        <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 space-y-1">
                          <div className="flex items-center gap-2 text-amber-800">
                            <Zap size={12} />
                            <span className="font-medium">AI 自動偵測</span>
                          </div>
                          <div className="text-amber-700">類型: {analysis.contentType}</div>
                          {analysis.suggestedModels.length > 0 && (
                            <div className="text-amber-700">
                              <span className="font-medium">建議模型:</span> {analysis.suggestedModels.slice(0, 2).map((id: string) => models.find((m: ModelConfig) => m.id === id)?.name).filter(Boolean).join(', ')}
                            </div>
                          )}
                          <div className="text-green-600 font-medium">信心度: {(analysis.confidence * 100).toFixed(0)}%</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {enableMultiAI && currentWorkflow && (
                <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <Users size={16} />
                    <span className="text-sm font-medium">多 AI 協作工作流程</span>
                  </div>
                  <div className="text-xs text-amber-700">
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
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-stone-800 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
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
                className="flex items-center justify-center w-12 h-12 bg-stone-300 hover:bg-stone-400 text-stone-700 rounded-xl transition-colors"
              >
                <Paperclip size={20} />
              </button>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                    : 'bg-stone-300 hover:bg-stone-400 text-stone-700'
                }`}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <button
                onClick={handleSend}
                disabled={(!inputMessage.trim() && attachments.length === 0) || isSending}
                className="flex items-center justify-center w-12 h-12 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
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
  onDownload,
  models
}: { 
  message: ChatMessage;
  onSpeak: (content: string) => void;
  onShare: (content: string) => void;
  onDownload: (file: File) => void;
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
            <div className="text-xs text-stone-600 bg-stone-100 rounded px-2 py-1">
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
            <div className="text-xs text-stone-600 bg-stone-100 rounded px-2 py-1">
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
            <div className="text-xs text-stone-600 bg-stone-100 rounded px-2 py-1">
              音頻分析: {(file.size / 1024 / 1024).toFixed(2)}MB • 建議模型: {analysis.suggestedModels.slice(0, 1).map((id: string) => models.find((m: ModelConfig) => m.id === id)?.name).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      );
    } else {
      URL.revokeObjectURL(fileUrl);
      return (
        <div className="space-y-2">
          <div className="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-sm text-stone-700">{file.name}</span>
              <div className="text-xs text-stone-500 mt-1">{file.type}</div>
            </div>
            <button
              onClick={() => onDownload(file)}
              className="p-2 text-amber-600 hover:text-amber-700 transition-colors"
              title="下載檔案"
            >
              <Download size={16} />
            </button>
          </div>
          {analysis && analysis.extractedContent && (
            <div className="text-xs text-stone-600 bg-stone-100 rounded px-2 py-1 max-w-xs">
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
            ? 'bg-amber-600 text-white rounded-br-md' 
            : 'bg-white border border-stone-300 text-stone-800 rounded-bl-md'
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
            <div className="mt-3 bg-amber-100 border border-amber-300 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <Users size={14} />
                <span className="text-sm font-medium">多 AI 協作結果</span>
              </div>
              <div className="text-xs text-amber-700 space-y-1">
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

        <div className={`flex items-center gap-2 mt-2 text-xs text-stone-500 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}>
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          
          {!isUser && (
            <>
              <button
                onClick={() => onSpeak(message.content)}
                className="p-1 hover:text-stone-700 transition-colors"
                title="朗讀"
              >
                <Volume2 size={14} />
              </button>
              <button
                onClick={() => onShare(message.content)}
                className="p-1 hover:text-stone-700 transition-colors"
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
