import { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { ModelConfig, MCPConfig, SavedCreation, LorebookEntry, Conversation, ExternalServiceConnector } from '../types';

type EntityType = 'model-configs' | 'mcp-configs' | 'conversations' | 'external-connectors' | 'saved-creations' | 'lorebook';

export function useApiData<T>(
  entityType: EntityType,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean, string | null] {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [entityType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      switch (entityType) {
        case 'model-configs':
          result = await apiService.getModelConfigs();
          break;
        case 'mcp-configs':
          result = await apiService.getMCPConfigs();
          break;
        case 'conversations':
          result = await apiService.getConversations();
          break;
        case 'external-connectors':
          result = await apiService.getExternalConnectors();
          break;
        case 'saved-creations':
          result = await apiService.getSavedCreations();
          break;
        case 'lorebook':
          result = await apiService.getLorebookEntries();
          break;
        default:
          result = defaultValue;
      }
      
      setData(result as T);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(defaultValue);
    } finally {
      setLoading(false);
    }
  };

  const updateData = async (newValue: T | ((prev: T) => T)) => {
    try {
      setError(null);
      const actualValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(data) : newValue;
      
      setData(actualValue);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      await loadData();
    }
  };

  return [data, updateData, loading, error];
}

export function useModelConfigs(defaultValue: ModelConfig[] = []) {
  const [data, updateData, loading, error] = useApiData<ModelConfig[]>('model-configs', defaultValue);
  
  const saveModelConfig = async (config: ModelConfig) => {
    try {
      await apiService.createModelConfig(config);
      const newData = await apiService.getModelConfigs();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const deleteModelConfig = async (id: string) => {
    try {
      await apiService.deleteModelConfig(id);
      await updateData(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { data, loading, error, saveModelConfig, deleteModelConfig, updateData };
}

export function useMCPConfigs(defaultValue: MCPConfig[] = []) {
  const [data, updateData, loading, error] = useApiData<MCPConfig[]>('mcp-configs', defaultValue);
  
  const saveMCPConfig = async (config: MCPConfig) => {
    try {
      await apiService.createMCPConfig(config);
      const newData = await apiService.getMCPConfigs();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const deleteMCPConfig = async (id: string) => {
    try {
      await apiService.deleteMCPConfig(id);
      await updateData(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { data, loading, error, saveMCPConfig, deleteMCPConfig, updateData };
}

export function useConversations(defaultValue: Conversation[] = []) {
  const [data, updateData, loading, error] = useApiData<Conversation[]>('conversations', defaultValue);
  
  const saveConversation = async (conversation: Conversation) => {
    try {
      await apiService.createConversation(conversation);
      const newData = await apiService.getConversations();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const updateConversation = async (id: string, conversation: Conversation) => {
    try {
      await apiService.updateConversation(id, conversation);
      const newData = await apiService.getConversations();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await apiService.deleteConversation(id);
      await updateData(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { data, loading, error, saveConversation, updateConversation, deleteConversation, updateData };
}

export function useExternalConnectors(defaultValue: ExternalServiceConnector[] = []) {
  const [data, updateData, loading, error] = useApiData<ExternalServiceConnector[]>('external-connectors', defaultValue);
  
  const saveExternalConnector = async (connector: ExternalServiceConnector) => {
    try {
      await apiService.createExternalConnector(connector);
      const newData = await apiService.getExternalConnectors();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const deleteExternalConnector = async (id: string) => {
    try {
      await apiService.deleteExternalConnector(id);
      await updateData(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { data, loading, error, saveExternalConnector, deleteExternalConnector, updateData };
}

export function useSavedCreations(defaultValue: SavedCreation[] = []) {
  const [data, updateData, loading, error] = useApiData<SavedCreation[]>('saved-creations', defaultValue);
  
  const saveCreation = async (creation: SavedCreation) => {
    try {
      await apiService.createSavedCreation(creation);
      const newData = await apiService.getSavedCreations();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const updateCreation = async (id: string, creation: SavedCreation) => {
    try {
      await apiService.updateSavedCreation(id, creation);
      const newData = await apiService.getSavedCreations();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const deleteCreation = async (id: string) => {
    try {
      await apiService.deleteSavedCreation(id);
      await updateData(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { data, loading, error, saveCreation, updateCreation, deleteCreation, updateData };
}

export function useLorebookEntries(defaultValue: LorebookEntry[] = []) {
  const [data, updateData, loading, error] = useApiData<LorebookEntry[]>('lorebook', defaultValue);
  
  const saveLorebookEntry = async (entry: LorebookEntry) => {
    try {
      await apiService.createLorebookEntry(entry);
      const newData = await apiService.getLorebookEntries();
      await updateData(newData);
    } catch (err) {
      throw err;
    }
  };

  const deleteLorebookEntry = async (id: string) => {
    try {
      await apiService.deleteLorebookEntry(id);
      await updateData(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return { data, loading, error, saveLorebookEntry, deleteLorebookEntry, updateData };
}
