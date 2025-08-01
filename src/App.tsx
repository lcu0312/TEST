import { useState, useEffect } from 'react';
import { Settings, Zap, MessageCircle, Library, LogOut } from 'lucide-react';
import { LoginView } from './components/LoginView';
import { SettingsModal } from './components/SettingsModal';
import { GeneratorView } from './components/GeneratorView';
import { ChatView } from './components/ChatView';
import { LibraryView } from './components/LibraryView';
import { useModelConfigs, useMCPConfigs, useSavedCreations, useLorebookEntries } from './hooks/useApiData';
import { SavedCreation, ViewMode, User } from './types';
import { DEFAULT_MCPS } from './utils';
import apiService from './services/apiService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('generator');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { data: modelConfigs, saveModelConfig, loadData: loadModelConfigs } = useModelConfigs([
    {
      id: 'default-google',
      name: '預設 Google AI',
      provider: 'google',
      apiKey: '',
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 2048
    }
  ], true);

  const { data: mcps, saveMCPConfig, loadData: loadMCPConfigs } = useMCPConfigs(DEFAULT_MCPS, true);

  const { data: savedCreations, saveCreation, updateCreation, deleteCreation, loadData: loadSavedCreations } = useSavedCreations([], true);

  const { data: lorebook, saveLorebookEntry, loadData: loadLorebookEntries } = useLorebookEntries([], true);

  useEffect(() => {
    const checkExistingAuth = async () => {
      console.log('App: checkExistingAuth called');
      try {
        let sessionToken = localStorage.getItem('session_token') || localStorage.getItem('sessionToken');
        console.log('App: Session token found:', sessionToken ? 'yes' : 'no');
        
        if (sessionToken) {
          localStorage.setItem('session_token', sessionToken);
          localStorage.removeItem('sessionToken'); // Remove old key if exists
          
          console.log('App: Getting current user...');
          const currentUser = await apiService.getCurrentUser();
          console.log('App: Current user:', currentUser);
          setUser(currentUser);
          
          console.log('App: Loading user data...');
          await Promise.all([
            loadModelConfigs(),
            loadMCPConfigs(),
            loadSavedCreations(),
            loadLorebookEntries()
          ]);
          console.log('App: All data loaded successfully');
        } else {
          console.log('App: No session token found');
        }
      } catch (error) {
        console.error('App: Auth check failed:', error);
        localStorage.removeItem('session_token');
        localStorage.removeItem('sessionToken');
      } finally {
        console.log('App: Setting isCheckingAuth to false');
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, []);

  const handleLogin = async (username: string) => {
    console.log('App: handleLogin called with username:', username);
    try {
      console.log('App: Calling apiService.login...');
      const result = await apiService.login(username);
      console.log('App: Login successful, user:', result.user);
      setUser(result.user);
      
      console.log('App: Loading user data...');
      await Promise.all([
        loadModelConfigs(),
        loadMCPConfigs(),
        loadSavedCreations(),
        loadLorebookEntries()
      ]);
      console.log('App: All data loaded successfully');
    } catch (error) {
      console.error('App: Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setCurrentView('generator');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSaveCreation = async (creation: SavedCreation) => {
    try {
      await saveCreation(creation);
    } catch (error) {
      console.error('Failed to save creation:', error);
    }
  };

  const handleUpdateCreation = async (updatedCreation: SavedCreation) => {
    try {
      await updateCreation(updatedCreation.id, updatedCreation);
    } catch (error) {
      console.error('Failed to update creation:', error);
    }
  };

  const handleDeleteCreation = async (id: string) => {
    try {
      await deleteCreation(id);
    } catch (error) {
      console.error('Failed to delete creation:', error);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">幻</span>
          </div>
          <p className="text-stone-600">正在檢查登入狀態...</p>
        </div>
      </div>
    );
  }

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
            mcps={mcps}
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
        setModelConfigs={saveModelConfig}
        mcps={mcps}
        setMcps={saveMCPConfig}
        lorebook={lorebook}
        setLorebook={saveLorebookEntry}
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
