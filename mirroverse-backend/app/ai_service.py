import uuid
import random
import os
from typing import Dict, Any, List, Optional
from app.models import GeneratorOutput, StoryGraph, StoryNode, Choice, ChatMessage, MCPConfig, ModelConfig
from app.database import database as db
from app.engine_modules import engine
from datetime import datetime

class AIService:
    def __init__(self):
        self.engine = engine
        
    async def generate_content(self, prompt: str, mcp_config_id: Optional[str] = None, files: Optional[List[Dict]] = None, user_id: str = None) -> GeneratorOutput:
        """Generate content using MCP pipeline or single model"""
        
        if mcp_config_id and user_id:
            user_mcps = db.get_user_data(user_id, 'mcp_configs')
            global_mcps = list(db.mcp_configs.values())
            all_mcps = user_mcps + global_mcps
            mcp_config = next((mcp for mcp in all_mcps if mcp.id == mcp_config_id), None)
            
            if mcp_config and mcp_config.steps:
                return await self.engine.execute_mcp_pipeline(mcp_config, prompt, user_id)
        
        if user_id:
            user_models = db.get_user_data(user_id, 'model_configs')
            if user_models:
                for model in user_models:
                    if model.api_key and model.api_key.strip():
                        return await self.engine.execute_single_generation(prompt, model)
        
        global_models = list(db.model_configs.values())
        for model in global_models:
            if model.api_key and model.api_key.strip():
                return await self.engine.execute_single_generation(prompt, model)
        
        default_model = ModelConfig(
            id="default-openai",
            name="預設 OpenAI GPT-4",
            provider="openai",
            model="gpt-4o",
            api_key=os.getenv("OPENAI_API_KEY", ""),
            parameters={"temperature": 0.7, "max_tokens": 2000},
            user_id=user_id or "default"
        )
        
        return await self.engine.execute_single_generation(prompt, default_model)
    
    async def chat_response(self, message: str, conversation_history: Optional[List[ChatMessage]] = None, model_config: Optional[ModelConfig] = None) -> str:
        """Generate chat response using specified model or default with meta-level correction"""
        
        try:
            if model_config:
                provider = self.engine.providers.get(model_config.provider, self.engine.providers['google'])
                response = await provider.generate_text(f"作為智能助手，請回應用戶的訊息：{message}", model_config)
                
                if "[系統診斷]" in response:
                    correction_context = {
                        "message": message,
                        "model_config": model_config,
                        "conversation_history": conversation_history,
                        "timestamp": datetime.now().isoformat()
                    }
                    db.correction_contexts = getattr(db, 'correction_contexts', {})
                    db.correction_contexts[model_config.user_id] = correction_context
                
                return response
            
            responses = [
                f"關於「{message}」，讓我進行系統性分析以提供最佳回應。",
                f"我正在運用元級思維來深度理解「{message}」的含義。",
                f"「{message}」觸發了我的多維度分析機制，讓我為您提供全面的見解。",
                f"基於元級糾錯協議，我會從多個角度來回應「{message}」。",
                f"很棒的想法！「{message}」值得進行系統性的創意探索。"
            ]
            
            return random.choice(responses)
            
        except Exception as e:
            error_context = {
                "error_message": str(e),
                "context": {
                    "message": message,
                    "service": "chat_response",
                    "timestamp": datetime.now().isoformat()
                }
            }
            
            if hasattr(self.engine, 'meta_correction_protocol'):
                protocol_result = await self.engine.meta_correction_protocol.execute_protocol(
                    error_context, model_config.user_id if model_config else "anonymous"
                )
                return f"[元級糾錯] 系統正在進行深度診斷和修復策略制定。請稍候..."
            
            return f"抱歉，處理您的訊息時遇到問題：{str(e)}"

ai_service = AIService()
