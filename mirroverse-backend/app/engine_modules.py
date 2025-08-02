import asyncio
import uuid
import os
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
    
    @abstractmethod
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        pass
    
    @abstractmethod
    async def generate_image(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        pass

class GoogleAIProvider(AIProvider):
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        try:
            if model_config.api_key:
                genai.configure(api_key=model_config.api_key)
                model = genai.GenerativeModel(model_config.model or 'gemini-1.5-flash')
                
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=model_config.parameters.get("temperature", 0.7),
                        max_output_tokens=model_config.parameters.get("max_tokens", 2000)
                    )
                )
                
                return response.text
            else:
                raise Exception("No API key provided")
                
        except Exception as e:
            logging.error(f"Google AI API error: {str(e)}")
            raise Exception(f"Google AI API failed: {str(e)}")
    
    async def generate_image(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"]
        color = random.choice(colors)
        encoded_prompt = prompt[:20].replace(" ", "%20")
        return f"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ7Y29sb3J9Ci8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj57ZW5jb2RlZF9wcm9tcHR9PC90ZXh0Pjwvc3ZnPg==".replace("{color}", color).replace("{encoded_prompt}", encoded_prompt)

class OpenAIProvider(AIProvider):
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        try:
            client = openai.AsyncOpenAI(api_key=model_config.api_key)
            
            response = await client.chat.completions.create(
                model=model_config.model or "gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=model_config.parameters.get("max_tokens", 2000),
                temperature=model_config.parameters.get("temperature", 0.7)
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logging.error(f"OpenAI API error: {str(e)}")
            raise Exception(f"OpenAI API failed: {str(e)}")
    
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
            raise Exception(f"OpenAI Image API failed: {str(e)}")

class AnthropicProvider(AIProvider):
    async def generate_text(self, prompt: str, model_config: ModelConfig, **kwargs) -> str:
        try:
            if model_config.api_key:
                client = anthropic.AsyncAnthropic(api_key=model_config.api_key)
                
                response = await client.messages.create(
                    model=model_config.model or "claude-3-haiku-20240307",
                    max_tokens=model_config.parameters.get("max_tokens", 2000),
                    temperature=model_config.parameters.get("temperature", 0.7),
                    messages=[{"role": "user", "content": prompt}]
                )
                
                return response.content[0].text
            else:
                raise Exception("No API key provided")
                
        except Exception as e:
            logging.error(f"Anthropic API error: {str(e)}")
            raise Exception(f"Anthropic API failed: {str(e)}")
    
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
        """Coordinate and integrate results from multiple engines"""
        
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

最終整合輸出:"""
        
        coordinator_config = None
        for config in user_model_configs.values():
            if config.provider == "anthropic":
                coordinator_config = config
                break
        
        if not coordinator_config:
            for config in user_model_configs.values():
                if config.api_key and config.api_key.strip():
                    coordinator_config = config
                    break
            
            if not coordinator_config:
                coordinator_config = ModelConfig(
                    id="default_coordinator",
                    name="Default OpenAI Coordinator",
                    provider="openai",
                    model="gpt-4o",
                    api_key=os.getenv("OPENAI_API_KEY", ""),
                    parameters={"temperature": 0.7, "max_tokens": 2000},
                    user_id=""
                )
        
        provider = self.providers.get(coordinator_config.provider, self.providers['google'])
        try:
            return await provider.generate_text(coordinator_prompt, coordinator_config)
        except Exception as e:
            print(f"Coordinator error: {e}")
            return "\n\n".join(step_outputs)
    
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

engine = EngineModule()
