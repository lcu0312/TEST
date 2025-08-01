import { ModelConfig, MCPConfig, SavedCreation, LorebookEntry, Conversation, ExternalServiceConnector } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  private sessionToken: string | null = null;

  constructor() {
    this.sessionToken = localStorage.getItem('session_token');
  }

  private getSessionToken(): string | null {
    if (!this.sessionToken) {
      this.sessionToken = localStorage.getItem('session_token');
    }
    return this.sessionToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const token = this.getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Authentication required');
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }


  async login(username: string): Promise<{ session_token: string; user: any }> {
    const result = await this.request<{ session_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });

    this.sessionToken = result.session_token;
    localStorage.setItem('session_token', this.sessionToken);
    
    return result;
  }

  async logout(): Promise<void> {
    if (this.sessionToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ session_token: this.sessionToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    this.sessionToken = null;
    localStorage.removeItem('session_token');
  }

  async getCurrentUser(): Promise<any> {
    return this.request('/auth/me');
  }

  async getModelConfigs(): Promise<ModelConfig[]> {
    return this.request('/model-configs');
  }

  async createModelConfig(config: ModelConfig): Promise<ModelConfig> {
    return this.request('/model-configs', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async updateModelConfig(id: string, config: ModelConfig): Promise<ModelConfig> {
    return this.request(`/model-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteModelConfig(id: string): Promise<void> {
    return this.request(`/model-configs/${id}`, {
      method: 'DELETE',
    });
  }

  async getMCPConfigs(): Promise<MCPConfig[]> {
    return this.request('/mcp-configs');
  }

  async createMCPConfig(config: MCPConfig): Promise<MCPConfig> {
    return this.request('/mcp-configs', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async updateMCPConfig(id: string, config: MCPConfig): Promise<MCPConfig> {
    return this.request(`/mcp-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteMCPConfig(id: string): Promise<void> {
    return this.request(`/mcp-configs/${id}`, {
      method: 'DELETE',
    });
  }

  async getConversations(): Promise<Conversation[]> {
    return this.request('/conversations');
  }

  async createConversation(conversation: Conversation): Promise<Conversation> {
    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify(conversation),
    });
  }

  async updateConversation(id: string, conversation: Conversation): Promise<Conversation> {
    return this.request(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(conversation),
    });
  }

  async deleteConversation(id: string): Promise<void> {
    return this.request(`/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  async getExternalConnectors(): Promise<ExternalServiceConnector[]> {
    return this.request('/external-connectors');
  }

  async createExternalConnector(connector: ExternalServiceConnector): Promise<ExternalServiceConnector> {
    return this.request('/external-connectors', {
      method: 'POST',
      body: JSON.stringify(connector),
    });
  }

  async updateExternalConnector(id: string, connector: ExternalServiceConnector): Promise<ExternalServiceConnector> {
    return this.request(`/external-connectors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(connector),
    });
  }

  async deleteExternalConnector(id: string): Promise<void> {
    return this.request(`/external-connectors/${id}`, {
      method: 'DELETE',
    });
  }

  async getSavedCreations(): Promise<SavedCreation[]> {
    return this.request('/saved-creations');
  }

  async createSavedCreation(creation: SavedCreation): Promise<SavedCreation> {
    return this.request('/saved-creations', {
      method: 'POST',
      body: JSON.stringify(creation),
    });
  }

  async updateSavedCreation(id: string, creation: SavedCreation): Promise<SavedCreation> {
    return this.request(`/saved-creations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(creation),
    });
  }

  async deleteSavedCreation(id: string): Promise<void> {
    return this.request(`/saved-creations/${id}`, {
      method: 'DELETE',
    });
  }

  async getLorebookEntries(): Promise<LorebookEntry[]> {
    return this.request('/lorebook');
  }

  async createLorebookEntry(entry: LorebookEntry): Promise<LorebookEntry> {
    return this.request('/lorebook', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async updateLorebookEntry(id: string, entry: LorebookEntry): Promise<LorebookEntry> {
    return this.request(`/lorebook/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
  }

  async deleteLorebookEntry(id: string): Promise<void> {
    return this.request(`/lorebook/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadFile(file: File): Promise<{ filename: string; file_path: string; content_type: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const token = this.getSessionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('Authentication required');
      }
      throw new Error(`Upload error: ${response.statusText}`);
    }

    return response.json();
  }

  async generateContent(data: { prompt: string; mcpConfigId: string; files?: any[] }): Promise<any> {
    return this.request('/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: data.prompt,
        mcpConfigId: data.mcpConfigId,
        files: data.files || []
      })
    });
  }

  async sendChatMessage(request: { message: string; conversationId?: string }): Promise<any> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async detectAvailableModels(): Promise<any> {
    return this.request('/ai/detect-models');
  }
}

export const apiService = new ApiService();
export default apiService;
