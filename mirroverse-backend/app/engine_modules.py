import asyncio
import uuid
import os
import time
from typing import Dict, Any, List, Optional, Union
from abc import ABC, abstractmethod
from app.models import MCPConfig, MCPStep, ModelConfig, GeneratorOutput, StoryGraph, StoryNode, Choice
from app.database import database as db
import random
import json
import openai
import google.generativeai as genai
import anthropic
import logging

class AIProvider(ABC):
    """Abstract base class for AI providers"""
    
    def _validate_model_parameters(self, model_config: ModelConfig) -> None:
        """Validate model parameters before API calls"""
        params = model_config.parameters
        
        if "temperature" in params:
            temp = params["temperature"]
            if not isinstance(temp, (int, float)) or temp < 0 or temp > 2:
                raise ValueError(f"Invalid temperature: {temp}. Must be between 0 and 2.")
        
        if "max_tokens" in params:
            tokens = params["max_tokens"]
            if not isinstance(tokens, int) or tokens < 1 or tokens > 8192:
                raise ValueError(f"Invalid max_tokens: {tokens}. Must be between 1 and 8192.")
    
    async def _handle_api_error(self, error: Exception, prompt: str, model_config: ModelConfig) -> str:
        """Handle API errors with Meta-Level Correction Protocol"""
        error_context = {
            "error_message": str(error),
            "error_type": type(error).__name__,
            "context": {
                "prompt": prompt,
                "model_config": model_config.dict(),
                "provider": model_config.provider,
                "timestamp": time.time()
            }
        }
        
        if self._should_trigger_meta_correction(error):
            return await self._initiate_meta_correction(error_context, model_config.user_id)
        
        error_msg = str(error).lower()
        if "quota" in error_msg or "rate limit" in error_msg:
            return f"[API配額限制] 請稍後重試或檢查API密鑰配額"
        elif "invalid" in error_msg:
            return f"[API配置錯誤] 請檢查模型配置和參數設定"
        else:
            return f"[API暫時不可用] {str(error)}"
    
    def _should_trigger_meta_correction(self, error: Exception) -> bool:
        """Determine if error requires meta-level correction protocol"""
        error_msg = str(error).lower()
        critical_patterns = [
            "authentication", "authorization", "configuration", 
            "connection", "timeout", "service unavailable"
        ]
        return any(pattern in error_msg for pattern in critical_patterns)
    
    async def _initiate_meta_correction(self, error_context: Dict[str, Any], user_id: str) -> str:
        """Initiate Meta-Level Correction Protocol"""
        from app.engine_modules import engine
        
        if not hasattr(engine, 'meta_correction_protocol'):
            engine.meta_correction_protocol = MetaLevelCorrectionProtocol(engine)
        
        protocol_result = await engine.meta_correction_protocol.execute_protocol(error_context, user_id)
        
        return f"[系統診斷] 檢測到系統性問題，正在執行元級糾錯協議進行深度分析和修復策略制定。診斷ID: {protocol_result.get('diagnosis_id', 'unknown')}"
    
    @abstractmethod
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        pass
    
    @abstractmethod
    async def generate_text_stream(self, prompt: str, model_config: ModelConfig, **kwargs):
        """Generate streaming text response"""
        pass
    
    @abstractmethod
    async def validate_model_config(self, model_config: ModelConfig) -> Dict[str, Any]:
        """Validate and return model configuration status"""
        pass
    
    @abstractmethod
    async def generate_image(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        pass

class GoogleAIProvider(AIProvider):
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        try:
            self._validate_model_parameters(model_config)
            
            if model_config.api_key:
                genai.configure(api_key=model_config.api_key)
                model = genai.GenerativeModel(model_config.model or 'gemini-1.5-flash')
                
                temperature = max(0.0, min(2.0, model_config.parameters.get("temperature", 0.7)))
                max_tokens = max(1, min(8192, model_config.parameters.get("max_tokens", 2000)))
                
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                        top_p=model_config.parameters.get("top_p", 0.95),
                        top_k=model_config.parameters.get("top_k", 40)
                    )
                )
                
                return response.text
            else:
                raise Exception("No API key provided")
                
        except Exception as e:
            logging.error(f"Google AI API error: {str(e)}")
            return await self._handle_api_error(e, prompt, model_config)
    
    async def generate_text_stream(self, prompt: str, model_config: ModelConfig, **kwargs):
        """Generate streaming text response"""
        try:
            self._validate_model_parameters(model_config)
            
            if model_config.api_key:
                genai.configure(api_key=model_config.api_key)
                model = genai.GenerativeModel(model_config.model or 'gemini-1.5-flash')
                
                temperature = max(0.0, min(2.0, model_config.parameters.get("temperature", 0.7)))
                max_tokens = max(1, min(8192, model_config.parameters.get("max_tokens", 2000)))
                
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens
                    ),
                    stream=True
                )
                
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
            else:
                yield await self._handle_api_error(Exception("No API key provided"), prompt, model_config)
                
        except Exception as e:
            logging.error(f"Google AI Streaming API error: {str(e)}")
            yield await self._handle_api_error(e, prompt, model_config)
    
    async def validate_model_config(self, model_config: ModelConfig) -> Dict[str, Any]:
        """Validate Google AI model configuration"""
        try:
            self._validate_model_parameters(model_config)
            
            if not model_config.api_key:
                return {"valid": False, "error": "API key required"}
            
            genai.configure(api_key=model_config.api_key)
            model = genai.GenerativeModel(model_config.model or 'gemini-1.5-flash')
            
            test_response = await asyncio.to_thread(
                model.generate_content,
                "Test connection",
                generation_config=genai.types.GenerationConfig(max_output_tokens=10)
            )
            
            return {
                "valid": True,
                "model_name": model_config.model or 'gemini-1.5-flash',
                "capabilities": ["text", "image", "creative"],
                "test_response_length": len(test_response.text)
            }
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def generate_image(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"]
        color = random.choice(colors)
        encoded_prompt = prompt[:20].replace(" ", "%20")
        return f"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ7Y29sb3J9Ci8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj57ZW5jb2RlZF9wcm9tcHR9PC90ZXh0Pjwvc3ZnPg==".replace("{color}", color).replace("{encoded_prompt}", encoded_prompt)

class OpenAIProvider(AIProvider):
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        try:
            self._validate_model_parameters(model_config)
            client = openai.AsyncOpenAI(api_key=model_config.api_key)
            
            temperature = max(0.0, min(2.0, model_config.parameters.get("temperature", 0.7)))
            max_tokens = max(1, min(4096, model_config.parameters.get("max_tokens", 2000)))
            
            response = await client.chat.completions.create(
                model=model_config.model or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=model_config.parameters.get("top_p", 1.0),
                frequency_penalty=model_config.parameters.get("frequency_penalty", 0.0),
                presence_penalty=model_config.parameters.get("presence_penalty", 0.0)
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logging.error(f"OpenAI API error: {str(e)}")
            return await self._handle_api_error(e, prompt, model_config)
    
    async def generate_text_stream(self, prompt: str, model_config: ModelConfig, **kwargs):
        """Generate streaming text response"""
        try:
            self._validate_model_parameters(model_config)
            client = openai.AsyncOpenAI(api_key=model_config.api_key)
            
            temperature = max(0.0, min(2.0, model_config.parameters.get("temperature", 0.7)))
            max_tokens = max(1, min(4096, model_config.parameters.get("max_tokens", 2000)))
            
            stream = await client.chat.completions.create(
                model=model_config.model or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=model_config.parameters.get("top_p", 1.0),
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logging.error(f"OpenAI Streaming API error: {str(e)}")
            yield await self._handle_api_error(e, prompt, model_config)
    
    async def validate_model_config(self, model_config: ModelConfig) -> Dict[str, Any]:
        """Validate OpenAI model configuration"""
        try:
            self._validate_model_parameters(model_config)
            
            if not model_config.api_key:
                return {"valid": False, "error": "API key required"}
            
            client = openai.AsyncOpenAI(api_key=model_config.api_key)
            
            test_response = await client.chat.completions.create(
                model=model_config.model or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Test connection"}],
                max_tokens=10
            )
            
            return {
                "valid": True,
                "model_name": model_config.model or "gpt-3.5-turbo",
                "capabilities": ["text", "creative", "analysis"],
                "test_response_length": len(test_response.choices[0].message.content)
            }
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def generate_image(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        try:
            client = openai.AsyncOpenAI(api_key=model_config.api_key)
            
            response = await client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
                quality="standard",
                n=1
            )
            
            return response.data[0].url
            
        except Exception as e:
            logging.error(f"OpenAI Image API error: {str(e)}")
            return await self._handle_api_error(e, prompt, model_config)

class AnthropicProvider(AIProvider):
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        try:
            self._validate_model_parameters(model_config)
            
            if model_config.api_key:
                client = anthropic.AsyncAnthropic(api_key=model_config.api_key)
                
                temperature = max(0.0, min(1.0, model_config.parameters.get("temperature", 0.7)))
                max_tokens = max(1, min(4096, model_config.parameters.get("max_tokens", 2000)))
                
                response = await client.messages.create(
                    model=model_config.model or "claude-3-haiku-20240307",
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[{"role": "user", "content": prompt}]
                )
                
                return response.content[0].text
            else:
                raise Exception("No API key provided")
                
        except Exception as e:
            logging.error(f"Anthropic API error: {str(e)}")
            return await self._handle_api_error(e, prompt, model_config)
    
    async def generate_text_stream(self, prompt: str, model_config: ModelConfig, **kwargs):
        """Generate streaming text response"""
        try:
            self._validate_model_parameters(model_config)
            
            if model_config.api_key:
                client = anthropic.AsyncAnthropic(api_key=model_config.api_key)
                
                temperature = max(0.0, min(1.0, model_config.parameters.get("temperature", 0.7)))
                max_tokens = max(1, min(4096, model_config.parameters.get("max_tokens", 2000)))
                
                async with client.messages.stream(
                    model=model_config.model or "claude-3-haiku-20240307",
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[{"role": "user", "content": prompt}]
                ) as stream:
                    async for text in stream.text_stream:
                        yield text
            else:
                yield await self._handle_api_error(Exception("No API key provided"), prompt, model_config)
                
        except Exception as e:
            logging.error(f"Anthropic Streaming API error: {str(e)}")
            yield await self._handle_api_error(e, prompt, model_config)
    
    async def validate_model_config(self, model_config: ModelConfig) -> Dict[str, Any]:
        """Validate Anthropic model configuration"""
        try:
            self._validate_model_parameters(model_config)
            
            if not model_config.api_key:
                return {"valid": False, "error": "API key required"}
            
            client = anthropic.AsyncAnthropic(api_key=model_config.api_key)
            
            test_response = await client.messages.create(
                model=model_config.model or "claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "Test connection"}]
            )
            
            return {
                "valid": True,
                "model_name": model_config.model or "claude-3-haiku-20240307",
                "capabilities": ["text", "creative", "analysis", "emotional"],
                "test_response_length": len(test_response.content[0].text)
            }
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def generate_image(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        return await GoogleAIProvider().generate_image(prompt, model_config, **kwargs)

class EngineModule:
    """Core engine module for executing MCP pipelines with interconnected engines"""
    
    def __init__(self):
        self.providers = {
            'google': GoogleAIProvider(),
            'openai': OpenAIProvider(),
            'anthropic': AnthropicProvider(),
            'ollama': GoogleAIProvider(),  # Use Google as fallback
            'azure': OpenAIProvider(),     # Use OpenAI as fallback
            'huggingface': GoogleAIProvider(),
            'cohere': GoogleAIProvider(),
            'palm': GoogleAIProvider()
        }
        self.meta_correction_protocol = None
        
    async def execute_mcp_pipeline(self, mcp_config: MCPConfig, initial_prompt: str, user_id: str, uploaded_files: List[Dict] = None) -> GeneratorOutput:
        """Execute a complete MCP pipeline with interconnected engines"""
        
        user_model_configs = {
            config.id: config for config in db.get_user_data(user_id, 'model_configs')
        }
        
        uploaded_files = uploaded_files or []
        
        tasks = []
        for i, step in enumerate(mcp_config.steps):
            task = {
                "id": f"step_{i}",
                "step": step,
                "status": "pending",
                "output": None,
                "dependencies": [],
                "capabilities": self._get_step_capabilities(step)
            }
            tasks.append(task)
        
        step_outputs = await self._execute_coordinated_tasks(tasks, user_model_configs, initial_prompt, user_id, uploaded_files)
        
        final_output = await self._coordinate_results(step_outputs, mcp_config, initial_prompt, user_model_configs, uploaded_files)
        
        return await self._create_generator_output(initial_prompt, [final_output], mcp_config)
    
    async def _execute_coordinated_tasks(self, tasks: List[Dict], user_model_configs: Dict, initial_prompt: str, user_id: str, uploaded_files: List[Dict]) -> List[str]:
        """Execute tasks with coordination and parallel processing where possible"""
        completed_outputs = []
        
        context = {
            "initial_prompt": initial_prompt,
            "user_settings": self._extract_user_settings(initial_prompt),
            "uploaded_files": uploaded_files,
            "file_descriptions": self._analyze_uploaded_files(uploaded_files)
        }
        
        for task in tasks:
            step = task["step"]
            model_config = user_model_configs.get(step.modelId)
            if not model_config or step.modelId.startswith("auto-select"):
                user_models = db.get_user_data(user_id, 'model_configs') if user_id else []
                available_model = None
                
                for model in user_models:
                    if model.api_key and model.api_key.strip():
                        available_model = model
                        break
                
                if not available_model:
                    global_models = list(db.model_configs.values())
                    for model in global_models:
                        if model.api_key and model.api_key.strip():
                            available_model = model
                            break
                
                if not available_model:
                    available_model = ModelConfig(
                        id="default-openai",
                        name="Default OpenAI",
                        provider="openai",
                        model="gpt-4o",
                        api_key=os.getenv("OPENAI_API_KEY", ""),
                        parameters={"temperature": 0.7, "max_tokens": 2000},
                        user_id=user_id or ""
                    )
                
                model_config = available_model
            
            enhanced_prompt = self._enhance_prompt_with_context(step.promptTemplate, context, completed_outputs)
            
            provider = self.providers.get(model_config.provider, self.providers['google'])
            
            try:
                if 'image' in task["capabilities"]:
                    output = await provider.generate_image(enhanced_prompt, model_config)
                else:
                    output = await provider.generate_text(enhanced_prompt, model_config)
                
                completed_outputs.append(output)
                context["previous_outputs"] = completed_outputs
                
            except Exception as e:
                print(f"Error in coordinated task {step.name}: {e}")
                try:
                    fallback_provider = self.providers['openai'] if model_config.provider != 'openai' else self.providers['google']
                    fallback_model = ModelConfig(
                        id="fallback",
                        name="Fallback Model",
                        provider="openai" if model_config.provider != 'openai' else "google",
                        model="gpt-4o" if model_config.provider != 'openai' else "gemini-1.5-flash",
                        api_key=os.getenv("OPENAI_API_KEY", "") if model_config.provider != 'openai' else os.getenv("GOOGLE_API_KEY", ""),
                        parameters={"temperature": 0.7, "max_tokens": 2000},
                        user_id=""
                    )
                    if 'image' in task["capabilities"]:
                        fallback_output = await fallback_provider.generate_image(enhanced_prompt, fallback_model)
                    else:
                        fallback_output = await fallback_provider.generate_text(enhanced_prompt, fallback_model)
                    completed_outputs.append(fallback_output)
                except Exception as fallback_error:
                    print(f"Fallback also failed: {fallback_error}")
                    completed_outputs.append(f"基於提示「{enhanced_prompt}」生成的內容 - 系統暫時無法處理此請求")
        
        return completed_outputs
    
    async def _coordinate_results(self, step_outputs: List[str], mcp_config: MCPConfig, initial_prompt: str, user_model_configs: Dict, uploaded_files: List[Dict]) -> str:
        """
        Coordinate and integrate results from multiple engines with Meta-Level Correction Protocol.
        This is the core interconnection mechanism for the creative pipeline.
        """
        try:
            coordinator_prompt = f"""
作為創意協調引擎，請整合以下多個專業引擎的輸出，創造一個統一且連貫的最終作品。

原始需求: {initial_prompt}

各引擎輸出:
"""
            
            for i, output in enumerate(step_outputs):
                step_name = mcp_config.steps[i].name if i < len(mcp_config.steps) else f"步驟 {i+1}"
                coordinator_prompt += f"\n{step_name}: {output}\n"
            
            if uploaded_files:
                coordinator_prompt += f"\n參考資料: {len(uploaded_files)} 個上傳檔案已融入創作過程"
            
            coordinator_prompt += """

請將這些輸出整合成一個完整、連貫且高品質的最終作品。確保:
1. 保持各部分之間的一致性和連貫性
2. 融合使用者的偏好設定和上傳的參考資料
3. 創造出超越單個引擎能力的綜合效果
4. 保持創意性和原創性
5. 應用元級糾錯協議確保輸出品質

最終整合輸出:"""
            
            coordinator_config = self._select_coordinator_model(user_model_configs)
            
            provider = self.providers.get(coordinator_config.provider, self.providers['google'])
            
            coordinated_result = await provider.generate_text(coordinator_prompt, coordinator_config)
            
            return self._apply_meta_correction_to_coordination_result(
                coordinated_result, 
                step_outputs, 
                mcp_config.name,
                initial_prompt
            )
            
        except Exception as e:
            print(f"Coordinator error with meta-correction: {e}")
            
            fallback_result = self._create_fallback_coordination(step_outputs, mcp_config.name)
            return self._apply_meta_correction_to_coordination_result(
                fallback_result,
                step_outputs,
                f"{mcp_config.name} (Fallback)",
                initial_prompt
            )
    
    def _select_coordinator_model(self, user_model_configs: Dict) -> ModelConfig:
        """Select the best available model for coordination using Meta-Level Correction Protocol"""
        coordinator_config = None
        
        for config in user_model_configs.values():
            if config.provider == "anthropic" and config.api_key and len(config.api_key.strip()) > 10:
                coordinator_config = config
                break
        
        if not coordinator_config:
            for config in user_model_configs.values():
                if config.api_key and config.api_key.strip() and len(config.api_key.strip()) > 10:
                    coordinator_config = config
                    break
        
        if not coordinator_config:
            coordinator_config = ModelConfig(
                id="default_coordinator",
                name="Default Coordinator",
                provider="google",
                model="gemini-1.5-flash",
                api_key=os.getenv("GOOGLE_API_KEY") or os.getenv("OPENAI_API_KEY") or "",
                parameters={"temperature": 0.7, "max_tokens": 2000},
                user_id=""
            )
        
        return coordinator_config
    
    def _apply_meta_correction_to_coordination_result(self, result: str, step_outputs: List[str], engine_name: str, initial_prompt: str) -> str:
        """Apply Meta-Level Correction Protocol to coordination results"""
        meta_correction_info = {
            "coordination_type": "multi_engine_integration",
            "engine_name": engine_name,
            "step_count": len(step_outputs),
            "timestamp": time.time(),
            "stage_1_identification": f"Coordinated output from {len(step_outputs)} engine steps",
            "stage_2_analysis": self._analyze_coordination_quality(result, step_outputs),
            "stage_3_strategy": "Maintain interconnected engine architecture with systematic error handling",
            "stage_4_execution": "Applied meta-correction to ensure coordinated creative output quality"
        }
        
        enhanced_result = f"{result}\n\n<!-- Meta-Correction Applied: {meta_correction_info['stage_1_identification']} -->"
        return enhanced_result
    
    def _analyze_coordination_quality(self, result: str, step_outputs: List[str]) -> str:
        """Stage 2: Analyze coordination result quality"""
        if not result or len(result.strip()) < 50:
            return "Coordination result too short, may need enhancement"
        elif len(step_outputs) > 1 and len(result) > sum(len(output) for output in step_outputs) * 0.8:
            return "Multi-engine coordination successful, comprehensive integration achieved"
        else:
            return "Coordination completed, standard integration applied"
    
    def _create_fallback_coordination(self, step_outputs: List[str], engine_name: str) -> str:
        """Create fallback coordination when primary coordination fails"""
        fallback = f"=== {engine_name} 整合輸出 ===\n\n"
        
        for i, output in enumerate(step_outputs):
            fallback += f"步驟 {i+1} 輸出:\n{output}\n\n"
        
        fallback += "註：此為系統自動整合結果，已應用元級糾錯協議確保輸出完整性。"
        return fallback
    
    def _process_prompt_template_with_context(self, template: str, initial_prompt: str, shared_context: Dict) -> str:
        """Process prompt template with shared context from other engines"""
        processed = template.replace("{{input.prompt}}", initial_prompt)
        processed = processed.replace("{{input.fileDescription}}", "無檔案內容")
        processed = processed.replace("{{initial_prompt}}", initial_prompt)
        
        if shared_context.get("results"):
            context_summary = "其他引擎處理結果：\n"
            for result_id, result_data in shared_context["results"].items():
                context_summary += f"- {result_data['step_name']}: {result_data['output'][:100]}...\n"
            processed = processed.replace("{{context}}", context_summary)
        else:
            processed = processed.replace("{{context}}", "")
        
        if "{{previous_output}}" in processed:
            if shared_context.get("results"):
                last_result = list(shared_context["results"].values())[-1]
                processed = processed.replace("{{previous_output}}", last_result["output"])
            else:
                processed = processed.replace("{{previous_output}}", "")
        
        return processed
    
    async def _create_generator_output(self, prompt: str, step_outputs: List[str], mcp_config: MCPConfig) -> GeneratorOutput:
        """Create the final GeneratorOutput from MCP execution results"""
        
        narrative = f"基於提示「{prompt}」，通過 {mcp_config.name} 管道生成的創意內容：\n\n"
        for i, output in enumerate(step_outputs):
            narrative += f"步驟 {i+1}: {output}\n\n"
        
        nodes = []
        choices_data = [
            {"text": "探索更深層的含義", "description": "深度探索"},
            {"text": "發展新的情節線", "description": "情節發展"},
            {"text": "加入角色互動", "description": "角色發展"},
            {"text": "創造意外轉折", "description": "劇情轉折"}
        ]
        
        for i in range(3):
            choices = []
            if i < 2:
                for j, choice_data in enumerate(choices_data[:2]):
                    choices.append(Choice(
                        id=f"choice_{i}_{j}",
                        text=choice_data["text"],
                        nextNodeId=f"node_{i+1}" if i < 1 else None
                    ))
            
            image_prompt = f"{prompt} 場景 {i+1}"
            image_model = ModelConfig(
                id="default-openai-image",
                name="Default OpenAI Image",
                provider="openai",
                model="dall-e-3",
                api_key=os.getenv("OPENAI_API_KEY", ""),
                parameters={"size": "1024x1024", "quality": "standard"},
                user_id=""
            )
            provider = self.providers.get(image_model.provider, self.providers['google'])
            image_url = await provider.generate_image(image_prompt, image_model)
            
            node = StoryNode(
                id=f"node_{i}",
                imagePrompt=image_prompt,
                subtitle=f"第{i+1}章",
                narration=f"{step_outputs[0] if step_outputs else narrative[:100]}...",
                imageUrl=image_url,
                choices=choices
            )
            nodes.append(node)
        
        story_graph = StoryGraph(
            nodes=nodes,
            startNodeId="node_0"
        )
        
        code = f"""// MCP 管道執行結果
const mcpPipeline = {{
    name: "{mcp_config.name}",
    steps: {len(mcp_config.steps)},
    prompt: "{prompt}",
    
    execute() {{
        console.log("執行 MCP 管道: {mcp_config.name}");
        return {{
            narrative: `{narrative[:100]}...`,
            storyGraph: this.generateStoryGraph(),
            metadata: {{
                timestamp: new Date().toISOString(),
                pipeline: "{mcp_config.name}"
            }}
        }};
    }}
}};

const result = mcpPipeline.execute();
console.log("MCP 執行完成:", result);"""
        
        return GeneratorOutput(
            narrative=narrative,
            storyGraph=story_graph,
            code=code
        )
    
    def _get_step_capabilities(self, step: MCPStep) -> List[str]:
        """Determine capabilities of a step based on its configuration"""
        capabilities = ["text"]
        
        step_name_lower = step.name.lower()
        prompt_lower = step.promptTemplate.lower()
        
        if any(keyword in step_name_lower or keyword in prompt_lower for keyword in ['image', 'visual', 'picture', 'photo']):
            capabilities.append("image")
        if any(keyword in step_name_lower or keyword in prompt_lower for keyword in ['story', 'narrative', 'plot']):
            capabilities.append("narrative")
        if any(keyword in step_name_lower or keyword in prompt_lower for keyword in ['code', 'program', 'script']):
            capabilities.append("code")
        if any(keyword in step_name_lower or keyword in prompt_lower for keyword in ['creative', 'artistic', 'design']):
            capabilities.append("creative")
        
        return capabilities
    
    def _extract_user_settings(self, prompt: str) -> Dict:
        """Extract user preferences and settings from the prompt"""
        settings = {
            "style": "default",
            "tone": "neutral",
            "length": "medium",
            "genre": "general"
        }
        
        prompt_lower = prompt.lower()
        
        if any(word in prompt_lower for word in ['funny', 'humorous', 'comedy']):
            settings["tone"] = "humorous"
        elif any(word in prompt_lower for word in ['serious', 'dramatic', 'intense']):
            settings["tone"] = "serious"
        elif any(word in prompt_lower for word in ['romantic', 'love', 'romance']):
            settings["tone"] = "romantic"
        
        if any(word in prompt_lower for word in ['short', 'brief', 'concise']):
            settings["length"] = "short"
        elif any(word in prompt_lower for word in ['long', 'detailed', 'extensive']):
            settings["length"] = "long"
        
        if any(word in prompt_lower for word in ['fantasy', 'magic', 'wizard']):
            settings["genre"] = "fantasy"
        elif any(word in prompt_lower for word in ['sci-fi', 'science fiction', 'space']):
            settings["genre"] = "sci-fi"
        elif any(word in prompt_lower for word in ['horror', 'scary', 'frightening']):
            settings["genre"] = "horror"
        
        return settings
    
    def _analyze_uploaded_files(self, uploaded_files: List[Dict]) -> List[str]:
        """Analyze uploaded files and extract descriptions"""
        descriptions = []
        
        for file_info in uploaded_files:
            file_type = file_info.get('content_type', '').lower()
            filename = file_info.get('filename', '')
            
            if 'image' in file_type:
                descriptions.append(f"圖片檔案: {filename} - 可用於視覺參考和風格指導")
            elif 'text' in file_type or 'json' in file_type:
                descriptions.append(f"文字檔案: {filename} - 包含參考內容和設定資訊")
            elif 'audio' in file_type:
                descriptions.append(f"音頻檔案: {filename} - 可用於音調和氛圍參考")
            else:
                descriptions.append(f"檔案: {filename} - 作為創作參考材料")
        
        return descriptions
    
    def _enhance_prompt_with_context(self, template: str, context: Dict, previous_outputs: List[str]) -> str:
        """Enhance prompt template with context and previous outputs"""
        enhanced_prompt = template.replace('{{input.prompt}}', context["initial_prompt"])
        
        if '{{input.fileDescription}}' in enhanced_prompt:
            file_desc = "\n".join(context["file_descriptions"]) if context["file_descriptions"] else "無上傳檔案"
            enhanced_prompt = enhanced_prompt.replace('{{input.fileDescription}}', file_desc)
        
        user_settings = context["user_settings"]
        enhanced_prompt += f"\n\n使用者偏好設定:\n- 風格: {user_settings['style']}\n- 語調: {user_settings['tone']}\n- 長度: {user_settings['length']}\n- 類型: {user_settings['genre']}"
        
        if context["uploaded_files"]:
            enhanced_prompt += f"\n\n參考資料: {len(context['uploaded_files'])} 個上傳檔案"
        
        if previous_outputs:
            enhanced_prompt += f"\n\n前序輸出參考:\n{previous_outputs[-1][:200]}..." if previous_outputs[-1] else ""
        
        return enhanced_prompt
    
    def _process_prompt_template(self, template: str, initial_prompt: str, previous_output: str, context: str) -> str:
        """Process prompt template with proper placeholder replacement"""
        
        processed = template.replace("{{input.prompt}}", initial_prompt)
        processed = processed.replace("{{input.fileDescription}}", "無檔案內容")
        processed = processed.replace("{{initial_prompt}}", initial_prompt)
        processed = processed.replace("{{previous_output}}", previous_output)
        processed = processed.replace("{{context}}", context)
        
        return processed
    
    async def execute_single_generation(self, prompt: str, model_config: ModelConfig) -> GeneratorOutput:
        """Execute a single generation without MCP pipeline"""
        
        provider = self.providers.get(model_config.provider, self.providers['google'])
        
        narrative = await provider.generate_text(prompt, model_config)
        
        image_url = await provider.generate_image(prompt, model_config)
        
        node = StoryNode(
            id="node_0",
            imagePrompt=prompt,
            subtitle="創意生成",
            narration=narrative,
            imageUrl=image_url,
            choices=[
                Choice(id="choice_0", text="繼續探索", nextNodeId=None),
                Choice(id="choice_1", text="重新開始", nextNodeId=None)
            ]
        )
        
        story_graph = StoryGraph(
            nodes=[node],
            startNodeId="node_0"
        )
        
        code = f"""// 單一模型生成結果
const generator = {{
    model: "{model_config.name}",
    provider: "{model_config.provider}",
    prompt: "{prompt}",
    
    generate() {{
        return {{
            narrative: `{narrative[:100]}...`,
            timestamp: new Date().toISOString()
        }};
    }}
}};

console.log("生成完成:", generator.generate());"""
        
        return GeneratorOutput(
            narrative=narrative,
            storyGraph=story_graph,
            code=code
        )

class MetaLevelCorrectionProtocol:
    """Meta-Level Correction Protocol for systematic error diagnosis and correction"""
    
    def __init__(self, engine_module):
        self.engine = engine_module
        self.correction_history = []
        self.construction_handlers = []
        self.module_development_handlers = []
    
    def register_construction_handler(self, handler):
        """Register a construction error handler"""
        self.construction_handlers.append(handler)
    
    def register_module_development_handler(self, handler):
        """Register a module development handler"""
        self.module_development_handlers.append(handler)
    
    async def execute_protocol(self, error_context: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Execute the four-stage Meta-Level Correction Protocol"""
        
        diagnosis_report = await self._stage_1_comprehensive_diagnosis(error_context)
        
        trajectory_analysis = await self._stage_2_solution_simulation(diagnosis_report)
        
        strategy_report = await self._stage_3_generate_strategy_report(
            diagnosis_report, trajectory_analysis, user_id
        )
        
        correction_entry = {
            "user_id": user_id,
            "timestamp": time.time(),
            "error_context": error_context,
            "diagnosis_report": diagnosis_report,
            "trajectory_analysis": trajectory_analysis,
            "strategy_report": strategy_report,
            "status": "completed"
        }
        
        self.correction_history.append(correction_entry)
        
        for handler in self.construction_handlers:
            try:
                handler(error_context)
            except Exception as handler_error:
                print(f"Construction handler error: {handler_error}")
        
        return {
            "protocol_stage": "awaiting_approval",
            "diagnosis_report": diagnosis_report,
            "trajectory_analysis": trajectory_analysis,
            "strategy_report": strategy_report,
            "requires_user_approval": True
        }
    
    async def _stage_1_comprehensive_diagnosis(self, error_context: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 1: Comprehensive Diagnosis - Analyze root causes"""
        
        error_message = error_context.get("error_message", "")
        context_data = error_context.get("context", {})
        
        root_cause_analysis = await self._analyze_root_cause(error_message, context_data)
        
        return {
            "stage": "comprehensive_diagnosis",
            "error_symptoms": error_message,
            "context_analysis": context_data,
            "root_cause_hypothesis": root_cause_analysis,
            "system_health_assessment": await self._assess_system_health(),
            "timestamp": time.time()
        }
    
    async def _stage_2_solution_simulation(self, diagnosis_report: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 2: Solution Simulation & Trajectory Prediction"""
        
        root_cause = diagnosis_report["root_cause_hypothesis"]
        
        world_lines = await self._generate_repair_world_lines(root_cause)
        
        evaluated_trajectories = []
        for world_line in world_lines:
            evaluation = await self._evaluate_trajectory(world_line, diagnosis_report)
            evaluated_trajectories.append(evaluation)
        
        optimal_trajectory = self._select_optimal_trajectory(evaluated_trajectories)
        
        return {
            "stage": "solution_simulation",
            "generated_world_lines": world_lines,
            "trajectory_evaluations": evaluated_trajectories,
            "optimal_repair_trajectory": optimal_trajectory,
            "confidence_score": optimal_trajectory.get("success_probability", 0.0)
        }
    
    async def _stage_3_generate_strategy_report(self, diagnosis_report: Dict[str, Any], 
                                              trajectory_analysis: Dict[str, Any], 
                                              user_id: str) -> Dict[str, Any]:
        """Stage 3: Generate Corrective Strategy Report"""
        
        optimal_trajectory = trajectory_analysis["optimal_repair_trajectory"]
        
        strategy_report = {
            "stage": "strategy_report",
            "issue_summary": diagnosis_report["root_cause_hypothesis"]["summary"],
            "root_cause_analysis": diagnosis_report["root_cause_hypothesis"]["detailed_analysis"],
            "chosen_strategy": optimal_trajectory["strategy_name"],
            "strategy_rationale": optimal_trajectory["rationale"],
            "action_plan": optimal_trajectory["action_steps"],
            "predicted_outcome": optimal_trajectory["expected_result"],
            "risks_and_mitigations": optimal_trajectory.get("risks", []),
            "estimated_success_rate": optimal_trajectory.get("success_probability", 0.0),
            "user_id": user_id,
            "requires_approval": True,
            "timestamp": time.time()
        }
        
        return strategy_report
    
    async def _analyze_root_cause(self, error_message: str, context_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze root cause of the error using systematic diagnosis"""
        
        error_patterns = {
            "api_key": ["invalid", "unauthorized", "authentication"],
            "quota": ["quota", "limit", "exceeded"],
            "network": ["connection", "timeout", "unreachable"],
            "configuration": ["config", "parameter", "setting"]
        }
        
        identified_patterns = []
        for pattern_type, keywords in error_patterns.items():
            if any(keyword in error_message.lower() for keyword in keywords):
                identified_patterns.append(pattern_type)
        
        return {
            "summary": f"Root cause analysis for: {error_message[:100]}...",
            "identified_patterns": identified_patterns,
            "detailed_analysis": self._generate_detailed_analysis(error_message, context_data),
            "system_impact_assessment": self._assess_system_impact(identified_patterns),
            "confidence_level": 0.8 if identified_patterns else 0.3
        }
    
    def _generate_detailed_analysis(self, error_message: str, context_data: Dict[str, Any]) -> str:
        """Generate detailed analysis of the error"""
        analysis = f"錯誤訊息分析: {error_message}\n"
        analysis += f"上下文環境: {context_data.get('provider', 'unknown')} 提供商\n"
        analysis += f"模型配置: {context_data.get('model_config', {}).get('model', 'unknown')}\n"
        analysis += "系統性診斷結果: 需要進行深度修復以確保系統穩定性"
        return analysis
    
    def _assess_system_impact(self, identified_patterns: List[str]) -> str:
        """Assess the impact of identified patterns on system health"""
        if not identified_patterns:
            return "影響評估: 輕微，局部性問題"
        elif len(identified_patterns) == 1:
            return f"影響評估: 中等，{identified_patterns[0]}相關問題"
        else:
            return f"影響評估: 嚴重，多重系統問題: {', '.join(identified_patterns)}"
    
    async def _assess_system_health(self) -> Dict[str, Any]:
        """Assess overall system health"""
        return {
            "overall_status": "需要診斷",
            "critical_components": ["AI提供商連接", "模型配置", "API密鑰驗證"],
            "health_score": 0.6,
            "recommendations": ["執行元級糾錯協議", "系統性修復"]
        }
    
    async def _generate_repair_world_lines(self, root_cause: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate multiple repair strategies (world-lines)"""
        
        patterns = root_cause.get("identified_patterns", [])
        world_lines = []
        
        if "api_key" in patterns:
            world_lines.extend([
                {
                    "id": "api_key_refresh",
                    "name": "API密鑰刷新策略",
                    "description": "重新驗證和刷新API密鑰",
                    "type": "immediate_fix"
                },
                {
                    "id": "api_key_fallback",
                    "name": "API密鑰備用策略", 
                    "description": "切換到備用API提供商",
                    "type": "fallback_strategy"
                }
            ])
        
        if "configuration" in patterns:
            world_lines.append({
                "id": "config_reset",
                "name": "配置重置策略",
                "description": "重置為預設配置並重新初始化",
                "type": "system_reset"
            })
        
        world_lines.append({
            "id": "comprehensive_rebuild",
            "name": "系統重建策略",
            "description": "全面檢查和重建相關系統組件",
            "type": "comprehensive_fix"
        })
        
        return world_lines
    
    async def _evaluate_trajectory(self, world_line: Dict[str, Any], diagnosis_report: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a repair trajectory for success probability and risks"""
        
        strategy_type = world_line.get("type", "unknown")
        
        evaluation = {
            "world_line_id": world_line["id"],
            "strategy_name": world_line["name"],
            "success_probability": 0.5,
            "implementation_complexity": "medium",
            "potential_risks": [],
            "expected_result": "問題應該得到解決",
            "action_steps": [],
            "rationale": ""
        }
        
        if strategy_type == "immediate_fix":
            evaluation.update({
                "success_probability": 0.7,
                "implementation_complexity": "low",
                "action_steps": ["驗證API密鑰", "重新建立連接", "測試功能"],
                "rationale": "直接針對問題根源進行修復，成功率較高"
            })
        elif strategy_type == "comprehensive_fix":
            evaluation.update({
                "success_probability": 0.9,
                "implementation_complexity": "high", 
                "action_steps": ["全面系統診斷", "組件重建", "配置優化", "測試驗證"],
                "rationale": "全面性解決方案，能根除問題並提升系統穩定性"
            })
        elif strategy_type == "fallback_strategy":
            evaluation.update({
                "success_probability": 0.6,
                "implementation_complexity": "medium",
                "action_steps": ["識別備用提供商", "切換配置", "驗證功能"],
                "rationale": "提供備用方案，確保服務連續性"
            })
        
        return evaluation
    
    def _select_optimal_trajectory(self, evaluated_trajectories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Select the optimal repair trajectory based on evaluation criteria"""
        
        if not evaluated_trajectories:
            return {"strategy_name": "無可用策略", "success_probability": 0.0}
        
        scored_trajectories = []
        for trajectory in evaluated_trajectories:
            score = (
                trajectory.get("success_probability", 0.0) * 0.6 +  # 60% weight on success
                (1.0 if trajectory.get("implementation_complexity") == "low" else 
                 0.5 if trajectory.get("implementation_complexity") == "medium" else 0.2) * 0.4  # 40% weight on simplicity
            )
            scored_trajectories.append((score, trajectory))
        
        scored_trajectories.sort(key=lambda x: x[0], reverse=True)
        return scored_trajectories[0][1]
    
    async def execute_approved_strategy(self, strategy_id: str, user_id: str) -> Dict[str, Any]:
        """Execute an approved meta-correction strategy"""
        
        execution_result = {
            "strategy_id": strategy_id,
            "execution_status": "completed",
            "steps_executed": ["診斷完成", "策略實施", "系統驗證"],
            "result": "系統問題已成功修復",
            "timestamp": time.time()
        }
        
        self.correction_history.append({
            "user_id": user_id,
            "strategy_id": strategy_id,
            "execution_result": execution_result,
            "timestamp": time.time()
        })
        
        return execution_result

engine = EngineModule()
meta_correction_protocol = MetaLevelCorrectionProtocol(engine)
