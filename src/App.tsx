import { useState } from 'react';
import { Settings, Zap, MessageCircle, Library, LogOut } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { SettingsModal } from './components/SettingsModal';
import { GeneratorView } from './components/GeneratorView';
import { ChatView } from './components/ChatView';
import { LibraryView } from './components/LibraryView';
import { useUserStorage } from './hooks/useUserStorage';
import { ModelConfig, MCPConfig, SavedCreation, ViewMode, User, LorebookEntry } from './types';
import { DEFAULT_MCPS } from './utils';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('generator');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [modelConfigs, setModelConfigs] = useUserStorage<ModelConfig[]>(
    user?.username || null,
    'modelConfigs',
    [
      {
        id: 'default-google',
        name: '預設 Google AI',
        provider: 'google',
        apiKey: '',
        model: 'gemini-pro',
        temperature: 0.7,
        maxTokens: 2048
      }
    ]
  );

  const [mcps, setMcps] = useUserStorage<MCPConfig[]>(
    user?.username || null,
    'mcps',
    DEFAULT_MCPS
  );

  const [savedCreations, setSavedCreations] = useUserStorage<SavedCreation[]>(
    user?.username || null,
    'savedCreations',
    []
  );

  const [lorebook, setLorebook] = useUserStorage<LorebookEntry[]>(
    user?.username || null,
    'lorebook',
    []
  );

  const handleLogin = (username: string) => {
    setUser({ username });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('generator');
  };

  const handleSaveCreation = (creation: SavedCreation) => {
    setSavedCreations(prev => [creation, ...prev]);
  };

  const handleUpdateCreation = (updatedCreation: SavedCreation) => {
    setSavedCreations(prev => 
      prev.map(creation => 
        creation.id === updatedCreation.id ? updatedCreation : creation
      )
    );
  };

  const handleDeleteCreation = (id: string) => {
    setSavedCreations(prev => prev.filter(creation => creation.id !== id));
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">
      {/* Header */}
      <header className="bg-stone-200/50 backdrop-blur-sm border-b border-stone-300 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">幻</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-800">幻影引擎</h1>
                <p className="text-xs text-stone-600">MirroVerse Engine</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {[
                { key: 'generator', label: '創意生成', icon: Zap },
                { key: 'chat', label: '智能對話', icon: MessageCircle },
                { key: 'library', label: '創作庫', icon: Library }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCurrentView(key as ViewMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentView === key
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'text-stone-600 hover:text-stone-800 hover:bg-stone-200/50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-stone-600 hover:text-stone-800 transition-colors"
                title="設定"
              >
                <Settings size={20} />
              </button>
              
              <div className="flex items-center gap-3 pl-3 border-l border-stone-400">
                <span className="text-sm text-stone-700">
                  {user.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-stone-600 hover:text-red-600 transition-colors"
                  title="登出"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'generator' && (
          <GeneratorView
            models={modelConfigs}
            mcps={mcps}
            lorebook={lorebook}
            onSaveCreation={handleSaveCreation}
          />
        )}

        {currentView === 'chat' && (
          <div className="h-[calc(100vh-12rem)]">
            <ChatView models={modelConfigs} userId={user?.username} />
          </div>
        )}

        {currentView === 'library' && (
          <LibraryView
            creations={savedCreations}
            onUpdateCreation={handleUpdateCreation}
            onDeleteCreation={handleDeleteCreation}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        modelConfigs={modelConfigs}
        setModelConfigs={setModelConfigs}
        mcps={mcps}
        setMcps={setMcps}
        lorebook={lorebook}
        setLorebook={setLorebook}
        userId={user?.username}
      />

      {/* Footer */}
      <footer className="bg-stone-200/30 border-t border-stone-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-stone-600 text-sm">
            <p>幻影引擎 (MirroVerse Engine) - AI 驅動的創意內容生成平台</p>
            <p className="mt-1">Powered by Multi-modal Creative Pipeline Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
