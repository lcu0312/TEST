from typing import Dict, List, Optional
from app.models import User, ModelConfig, MCPConfig, Conversation, SavedCreation, LorebookEntry, ExternalServiceConnector
import uuid
import os
from datetime import datetime

class DatabaseMetaCorrectionIntegration:
    """
    Meta-Level Correction Protocol integration for database operations.
    Ensures all database operations follow systematic error handling and correction.
    """
    
    def __init__(self):
        self.operation_history = []
        self.correction_contexts = {}
    
    def apply_meta_correction_to_operation(self, operation_name: str, operation_func, *args, **kwargs):
        """Apply meta-level correction protocol to database operations"""
        try:
            self._validate_operation_context(operation_name, args, kwargs)
            
            result = operation_func(*args, **kwargs)
            
            self._validate_operation_result(operation_name, result)
            
            self.operation_history.append({
                "operation": operation_name,
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "args_count": len(args),
                "kwargs_keys": list(kwargs.keys())
            })
            
            return result
            
        except Exception as e:
            error_context = {
                "error_message": str(e),
                "operation": operation_name,
                "service": "database_operation",
                "timestamp": datetime.now().isoformat(),
                "args": str(args)[:200],
                "kwargs": str(kwargs)[:200]
            }
            
            correction_id = str(uuid.uuid4())
            self.correction_contexts[correction_id] = error_context
            
            self.operation_history.append({
                "operation": operation_name,
                "timestamp": datetime.now().isoformat(),
                "status": "failed",
                "error": str(e),
                "correction_id": correction_id
            })
            
            raise Exception(f"[Database Meta-Correction] {operation_name} failed: {str(e)} (Correction ID: {correction_id})")
    
    def _validate_operation_context(self, operation_name: str, args, kwargs):
        """Stage 1: Validate operation context before execution"""
        if operation_name in ["create_item", "update_item"] and not args:
            raise ValueError(f"Meta-Correction: {operation_name} requires arguments")
        
        if operation_name == "get_item" and len(args) < 2:
            raise ValueError(f"Meta-Correction: {operation_name} requires item_type and item_id")
    
    def _validate_operation_result(self, operation_name: str, result):
        """Stage 4: Validate operation result after execution"""
        if operation_name.startswith("get_") and result is None:
            pass
        
        if operation_name.startswith("create_") and not result:
            raise ValueError(f"Meta-Correction: {operation_name} returned empty result")

db_meta_correction = DatabaseMetaCorrectionIntegration()

class InMemoryDatabase:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.sessions: Dict[str, str] = {}
        self.model_configs: Dict[str, ModelConfig] = {}
        self.mcp_configs: Dict[str, MCPConfig] = {}
        self.conversations: Dict[str, Conversation] = {}
        self.saved_creations: Dict[str, SavedCreation] = {}
        self.lorebook_entries: Dict[str, LorebookEntry] = {}
        self.external_connectors: Dict[str, ExternalServiceConnector] = {}
        self.uploaded_files: Dict[str, Dict] = {}
        
        self._init_default_data()
        self._restore_sessions_from_file()
    
    def _init_default_data(self):
        default_user = User(
            id="default_user",
            username="testuser",
            email="test@example.com",
            created_at=datetime.now().isoformat(),
            preferences={}
        )
        self.users[default_user.id] = default_user
        
        default_model = ModelConfig(
            id="default_model",
            name="Google Gemini 1.5 Flash",
            provider="google",
            model="gemini-1.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY", ""),
            endpoint="https://generativelanguage.googleapis.com/v1beta",
            parameters={"temperature": 0.7, "max_tokens": 2000},
            user_id=default_user.id
        )
        self.model_configs[default_model.id] = default_model
        
        openai_model = ModelConfig(
            id="openai_model",
            name="OpenAI GPT-4",
            provider="openai",
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY", ""),
            endpoint="https://api.openai.com/v1",
            parameters={"temperature": 0.7, "max_tokens": 2000},
            user_id=default_user.id
        )
        self.model_configs[openai_model.id] = openai_model
        
        default_mcps = [
            {
                "id": "echo-board",
                "name": "同步心象筆記板 (EchoBoard)",
                "steps": [
                    {
                        "id": "scene-analysis",
                        "name": "場景分析",
                        "modelId": "auto-select-vision",
                        "promptTemplate": "分析輸入內容並生成多版本視角的基礎場景概念：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n請根據輸入（文本/圖片）生成多個視角的場景描述和角色核心概念。\n\n回應格式：\n{\n  \"narrative\": \"場景分析結果\",\n  \"storyGraph\": {\n    \"startNodeId\": \"scene1\",\n    \"nodes\": [\n      {\n        \"id\": \"scene1\",\n        \"imagePrompt\": \"主場景視覺描述\",\n        \"subtitle\": \"場景標題\",\n        \"narration\": \"場景敘述\",\n        \"choices\": [\n          {\"text\": \"視角1\", \"nextNodeId\": \"perspective1\"},\n          {\"text\": \"視角2\", \"nextNodeId\": \"perspective2\"}\n        ]\n      }\n    ]\n  },\n  \"code\": \"場景數據結構\"\n}"
                    }
                ]
            },
            {
                "id": "multisight-editor",
                "name": "多視域同步編輯器 (MultiSight Editor)",
                "steps": [
                    {
                        "id": "multi-perspective",
                        "name": "多角度版本故事編輯",
                        "modelId": "auto-select-text",
                        "promptTemplate": "創建多角度版本故事編輯，形成複雜世界觀分支：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n生成包含多個角色視角的複雜故事分支結構。"
                    }
                ]
            },
            {
                "id": "narrative-weaver",
                "name": "敘事編織器 (Narrative Weaver)",
                "steps": [
                    {
                        "id": "story-structure",
                        "name": "故事結構設計",
                        "modelId": "auto-select-text",
                        "promptTemplate": "基於輸入創建完整的敘事結構：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n設計包含起承轉合的完整故事架構。"
                    }
                ]
            },
            {
                "id": "character-forge",
                "name": "角色鍛造廠 (Character Forge)",
                "steps": [
                    {
                        "id": "character-creation",
                        "name": "角色創建",
                        "modelId": "auto-select-text",
                        "promptTemplate": "根據輸入創造豐富的角色設定：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n生成詳細的角色背景、性格和動機。"
                    }
                ]
            },
            {
                "id": "world-architect",
                "name": "世界建築師 (World Architect)",
                "steps": [
                    {
                        "id": "world-building",
                        "name": "世界構建",
                        "modelId": "auto-select-text",
                        "promptTemplate": "構建豐富的世界設定：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n創造詳細的世界觀、歷史和文化背景。"
                    }
                ]
            },
            {
                "id": "dialogue-master",
                "name": "對話大師 (Dialogue Master)",
                "steps": [
                    {
                        "id": "dialogue-creation",
                        "name": "對話創作",
                        "modelId": "auto-select-text",
                        "promptTemplate": "創作生動的對話內容：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n生成符合角色性格的自然對話。"
                    }
                ]
            },
            {
                "id": "scene-painter",
                "name": "場景畫師 (Scene Painter)",
                "steps": [
                    {
                        "id": "scene-description",
                        "name": "場景描述",
                        "modelId": "auto-select-text",
                        "promptTemplate": "創作詳細的場景描述：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n生成豐富的環境和氛圍描述。"
                    }
                ]
            },
            {
                "id": "plot-twister",
                "name": "情節轉折器 (Plot Twister)",
                "steps": [
                    {
                        "id": "plot-development",
                        "name": "情節發展",
                        "modelId": "auto-select-text",
                        "promptTemplate": "設計意外的情節轉折：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n創造引人入勝的劇情發展和轉折。"
                    }
                ]
            },
            {
                "id": "emotion-sculptor",
                "name": "情感雕塑師 (Emotion Sculptor)",
                "steps": [
                    {
                        "id": "emotional-depth",
                        "name": "情感深度",
                        "modelId": "auto-select-text",
                        "promptTemplate": "雕塑深層的情感內容：\n\n用戶輸入：{{input.prompt}}\n檔案內容：{{input.fileDescription}}\n\n創造觸動人心的情感表達和內心描寫。"
                    }
                ]
            }
        ]
        
        for mcp_data in default_mcps:
            mcp = MCPConfig(**mcp_data)
            self.mcp_configs[mcp.id] = mcp

    def _restore_sessions_from_file(self):
        """Restore sessions from persistent file storage"""
        try:
            import os
            import json
            session_file = os.path.expanduser("~/sessions.json")
            if os.path.exists(session_file):
                with open(session_file, 'r') as f:
                    sessions_data = json.load(f)
                self.sessions.update(sessions_data)
                print(f"DEBUG: Restored {len(sessions_data)} sessions from file")
            else:
                print(f"DEBUG: No session file found, starting fresh")
        except Exception as e:
            print(f"DEBUG: Failed to restore sessions from file: {e}")
            default_session = str(uuid.uuid4())
            self.sessions[default_session] = "default_user"
            print(f"DEBUG: Created fallback session {default_session[:8]}... for default_user")
    
    def create_session(self, user_id: str) -> str:
        session_token = str(uuid.uuid4())
        self.sessions[session_token] = user_id
        print(f"DEBUG: Created session {session_token[:8]}... for user {user_id}")
        print(f"DEBUG: Total sessions after creation: {len(self.sessions)}")
        
        try:
            import os
            import json
            session_file = os.path.expanduser("~/sessions.json")
            sessions_data = {}
            if os.path.exists(session_file):
                with open(session_file, 'r') as f:
                    sessions_data = json.load(f)
            sessions_data[session_token] = user_id
            with open(session_file, 'w') as f:
                json.dump(sessions_data, f)
            print(f"DEBUG: Session persisted to file at {session_file}")
        except Exception as e:
            print(f"DEBUG: Failed to persist session: {e}")
        
        return session_token
    
    def get_user_by_session(self, session_token: str) -> Optional[User]:
        print(f"DEBUG: Looking up session {session_token[:8] if session_token else 'None'}...")
        print(f"DEBUG: Available sessions: {[s[:8] + '...' for s in self.sessions.keys()]}")
        print(f"DEBUG: Total sessions available: {len(self.sessions)}")
        
        try:
            import os
            import json
            session_file = os.path.expanduser("~/sessions.json")
            if os.path.exists(session_file):
                with open(session_file, 'r') as f:
                    sessions_data = json.load(f)
                for token, uid in sessions_data.items():
                    if token not in self.sessions:
                        self.sessions[token] = uid
                print(f"DEBUG: Restored {len(sessions_data)} sessions from file")
        except Exception as e:
            print(f"DEBUG: Failed to restore sessions from file: {e}")
        
        user_id = self.sessions.get(session_token)
        
        if user_id:
            user = self.users.get(user_id)
            print(f"DEBUG: Found user {user.username if user else 'None'} for session {session_token[:8]}...")
            return user
        print(f"DEBUG: Session {session_token[:8] if session_token else 'None'}... not found")
        return None
    
    def invalidate_session(self, session_token: str):
        if session_token in self.sessions:
            del self.sessions[session_token]
            try:
                import os
                import json
                session_file = os.path.expanduser("~/sessions.json")
                if os.path.exists(session_file):
                    with open(session_file, 'r') as f:
                        sessions_data = json.load(f)
                    if session_token in sessions_data:
                        del sessions_data[session_token]
                        with open(session_file, 'w') as f:
                            json.dump(sessions_data, f)
                        print(f"DEBUG: Session {session_token[:8]}... removed from persistent storage")
            except Exception as e:
                print(f"DEBUG: Failed to remove session from persistent storage: {e}")
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        for user in self.users.values():
            if user.username == username:
                return user
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def get_user_data(self, user_id: str, data_type: str) -> List:
        data_map = {
            'model_configs': self.model_configs,
            'mcp_configs': self.mcp_configs,
            'conversations': self.conversations,
            'saved_creations': self.saved_creations,
            'lorebook_entries': self.lorebook_entries,
            'external_connectors': self.external_connectors
        }
        
        data_store = data_map.get(data_type, {})
        
        if data_type == 'mcp_configs':
            return list(data_store.values())
        
        return [item for item in data_store.values() if hasattr(item, 'user_id') and item.user_id == user_id]
    
    def add_item(self, item, data_type: str):
        data_map = {
            'model_configs': self.model_configs,
            'mcp_configs': self.mcp_configs,
            'conversations': self.conversations,
            'saved_creations': self.saved_creations,
            'lorebook_entries': self.lorebook_entries,
            'external_connectors': self.external_connectors
        }
        
        data_store = data_map.get(data_type)
        if data_store is not None:
            data_store[item.id] = item
    
    def update_item(self, item_id: str, item, data_type: str):
        data_map = {
            'model_configs': self.model_configs,
            'mcp_configs': self.mcp_configs,
            'conversations': self.conversations,
            'saved_creations': self.saved_creations,
            'lorebook_entries': self.lorebook_entries,
            'external_connectors': self.external_connectors
        }
        
        data_store = data_map.get(data_type)
        if data_store is not None and item_id in data_store:
            data_store[item_id] = item
    
    def delete_item(self, item_id: str, data_type: str):
        data_map = {
            'model_configs': self.model_configs,
            'mcp_configs': self.mcp_configs,
            'conversations': self.conversations,
            'saved_creations': self.saved_creations,
            'lorebook_entries': self.lorebook_entries,
            'external_connectors': self.external_connectors
        }
        
        data_store = data_map.get(data_type)
        if data_store is not None and item_id in data_store:
            del data_store[item_id]
    
    def get_item(self, item_id: str, data_type: str):
        data_map = {
            'model_configs': self.model_configs,
            'mcp_configs': self.mcp_configs,
            'conversations': self.conversations,
            'saved_creations': self.saved_creations,
            'lorebook_entries': self.lorebook_entries,
            'external_connectors': self.external_connectors
        }
        
        data_store = data_map.get(data_type, {})
        return data_store.get(item_id)

database = InMemoryDatabase()
