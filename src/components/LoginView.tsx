import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: (username: string, password: string) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginView: Form submitted', { username, password: password ? '***' : '' });
    
    if (username.trim() && password.trim()) {
      try {
        console.log('LoginView: Calling onLogin with username:', username);
        await onLogin(username, password);
        console.log('LoginView: onLogin completed successfully');
      } catch (error) {
        console.error('LoginView: Login error:', error);
        setError(`登入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      }
    } else {
      console.log('LoginView: Validation failed - empty fields');
      setError('請輸入用戶名和密碼');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center p-4">
      <div className="bg-stone-200/50 backdrop-blur-sm border border-stone-300 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-stone-800 mb-2">幻影引擎</h1>
          <p className="text-stone-600">MirroVerse Engine</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="用戶名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <input
              type="password"
              placeholder="密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg text-stone-800 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}
          
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            登入
          </button>
        </form>
        
        <div className="text-center mt-6">
          <small className="text-stone-500">演示：輸入任意用戶名和密碼即可登入</small>
        </div>
      </div>
    </div>
  );
}
