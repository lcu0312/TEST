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
        """Generate chat response using specified model or default"""
        
        if model_config:
            provider = self.engine.providers.get(model_config.provider, self.engine.providers['google'])
            return await provider.generate_text(f"作為智能助手，請回應用戶的訊息：{message}", model_config)
        
        responses = [
            f"關於「{message}」，這是一個很有趣的想法！讓我們一起探索更多可能性。",
            f"我理解你提到的「{message}」。這讓我想到了一些創意的方向...",
            f"「{message}」確實值得深入思考。我們可以從不同角度來分析這個概念。",
            f"基於你的輸入「{message}」，我建議我們可以嘗試以下幾個創意方向...",
            f"很棒的想法！「{message}」可以成為一個很好的創作起點。"
        ]
        
        return random.choice(responses)

ai_service = AIService()
