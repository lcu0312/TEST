from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uuid
from datetime import datetime

from app.models import *
from app.database import database as db
from app.auth import get_current_user, get_optional_user
from app.ai_service import ai_service

app = FastAPI(title="MirroVerse Engine API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = db.get_user_by_username(request.username)
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            username=request.username,
            email=f"{request.username}@example.com",
            created_at=datetime.now().isoformat(),
            preferences={}
        )
        db.users[user.id] = user
    
    session_token = db.create_session(user.id)
    return LoginResponse(session_token=session_token, user=user)

@app.post("/auth/logout")
async def logout(request: LogoutRequest):
    db.invalidate_session(request.session_token)
    return {"message": "Logged out successfully"}

@app.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/model-configs", response_model=List[ModelConfig])
async def get_model_configs(current_user: User = Depends(get_current_user)):
    return db.get_user_data(current_user.id, 'model_configs')

@app.post("/model-configs", response_model=ModelConfig)
async def create_model_config(config: ModelConfig, current_user: User = Depends(get_current_user)):
    config.id = str(uuid.uuid4())
    config.user_id = current_user.id
    db.add_item(config, 'model_configs')
    return config

@app.put("/model-configs/{config_id}", response_model=ModelConfig)
async def update_model_config(config_id: str, config: ModelConfig, current_user: User = Depends(get_current_user)):
    existing = db.get_item(config_id, 'model_configs')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Model config not found")
    
    config.id = config_id
    config.user_id = current_user.id
    db.update_item(config_id, config, 'model_configs')
    return config

@app.delete("/model-configs/{config_id}")
async def delete_model_config(config_id: str, current_user: User = Depends(get_current_user)):
    existing = db.get_item(config_id, 'model_configs')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Model config not found")
    
    db.delete_item(config_id, 'model_configs')
    return {"message": "Model config deleted"}

@app.get("/mcp-configs", response_model=List[MCPConfig])
async def get_mcp_configs(current_user: User = Depends(get_current_user)):
    return db.get_user_data(current_user.id, 'mcp_configs')

@app.post("/mcp-configs", response_model=MCPConfig)
async def create_mcp_config(config: MCPConfig, current_user: User = Depends(get_current_user)):
    config.id = str(uuid.uuid4())
    for step in config.steps:
        step.id = str(uuid.uuid4())
    db.add_item(config, 'mcp_configs')
    return config

@app.put("/mcp-configs/{config_id}", response_model=MCPConfig)
async def update_mcp_config(config_id: str, config: MCPConfig, current_user: User = Depends(get_current_user)):
    existing = db.get_item(config_id, 'mcp_configs')
    if not existing:
        raise HTTPException(status_code=404, detail="MCP config not found")
    
    config.id = config_id
    db.update_item(config_id, config, 'mcp_configs')
    return config

@app.delete("/mcp-configs/{config_id}")
async def delete_mcp_config(config_id: str, current_user: User = Depends(get_current_user)):
    existing = db.get_item(config_id, 'mcp_configs')
    if not existing:
        raise HTTPException(status_code=404, detail="MCP config not found")
    
    db.delete_item(config_id, 'mcp_configs')
    return {"message": "MCP config deleted"}

@app.get("/conversations", response_model=List[Conversation])
async def get_conversations(current_user: User = Depends(get_current_user)):
    return db.get_user_data(current_user.id, 'conversations')

@app.post("/conversations", response_model=Conversation)
async def create_conversation(conversation: Conversation, current_user: User = Depends(get_current_user)):
    conversation.id = str(uuid.uuid4())
    conversation.user_id = current_user.id
    conversation.created_at = datetime.now().isoformat()
    conversation.updated_at = datetime.now().isoformat()
    for message in conversation.messages:
        message.id = str(uuid.uuid4())
    db.add_item(conversation, 'conversations')
    return conversation

@app.put("/conversations/{conversation_id}", response_model=Conversation)
async def update_conversation(conversation_id: str, conversation: Conversation, current_user: User = Depends(get_current_user)):
    existing = db.get_item(conversation_id, 'conversations')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation.id = conversation_id
    conversation.user_id = current_user.id
    conversation.updated_at = datetime.now().isoformat()
    db.update_item(conversation_id, conversation, 'conversations')
    return conversation

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    existing = db.get_item(conversation_id, 'conversations')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    db.delete_item(conversation_id, 'conversations')
    return {"message": "Conversation deleted"}

@app.get("/external-connectors", response_model=List[ExternalServiceConnector])
async def get_external_connectors(current_user: User = Depends(get_current_user)):
    return db.get_user_data(current_user.id, 'external_connectors')

@app.post("/external-connectors", response_model=ExternalServiceConnector)
async def create_external_connector(connector: ExternalServiceConnector, current_user: User = Depends(get_current_user)):
    connector.id = str(uuid.uuid4())
    connector.user_id = current_user.id
    db.add_item(connector, 'external_connectors')
    return connector

@app.put("/external-connectors/{connector_id}", response_model=ExternalServiceConnector)
async def update_external_connector(connector_id: str, connector: ExternalServiceConnector, current_user: User = Depends(get_current_user)):
    existing = db.get_item(connector_id, 'external_connectors')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="External connector not found")
    
    connector.id = connector_id
    connector.user_id = current_user.id
    db.update_item(connector_id, connector, 'external_connectors')
    return connector

@app.delete("/external-connectors/{connector_id}")
async def delete_external_connector(connector_id: str, current_user: User = Depends(get_current_user)):
    existing = db.get_item(connector_id, 'external_connectors')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="External connector not found")
    
    db.delete_item(connector_id, 'external_connectors')
    return {"message": "External connector deleted"}

@app.get("/saved-creations", response_model=List[SavedCreation])
async def get_saved_creations(current_user: User = Depends(get_current_user)):
    return db.get_user_data(current_user.id, 'saved_creations')

@app.post("/saved-creations", response_model=SavedCreation)
async def create_saved_creation(creation: SavedCreation, current_user: User = Depends(get_current_user)):
    creation.id = str(uuid.uuid4())
    creation.user_id = current_user.id
    db.add_item(creation, 'saved_creations')
    return creation

@app.put("/saved-creations/{creation_id}", response_model=SavedCreation)
async def update_saved_creation(creation_id: str, creation: SavedCreation, current_user: User = Depends(get_current_user)):
    existing = db.get_item(creation_id, 'saved_creations')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Saved creation not found")
    
    creation.id = creation_id
    creation.user_id = current_user.id
    db.update_item(creation_id, creation, 'saved_creations')
    return creation

@app.delete("/saved-creations/{creation_id}")
async def delete_saved_creation(creation_id: str, current_user: User = Depends(get_current_user)):
    existing = db.get_item(creation_id, 'saved_creations')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Saved creation not found")
    
    db.delete_item(creation_id, 'saved_creations')
    return {"message": "Saved creation deleted"}

@app.get("/lorebook", response_model=List[LorebookEntry])
async def get_lorebook_entries(current_user: User = Depends(get_current_user)):
    return db.get_user_data(current_user.id, 'lorebook_entries')

@app.post("/lorebook", response_model=LorebookEntry)
async def create_lorebook_entry(entry: LorebookEntry, current_user: User = Depends(get_current_user)):
    entry.id = str(uuid.uuid4())
    entry.user_id = current_user.id
    entry.created_at = datetime.now().isoformat()
    db.add_item(entry, 'lorebook_entries')
    return entry

@app.put("/lorebook/{entry_id}", response_model=LorebookEntry)
async def update_lorebook_entry(entry_id: str, entry: LorebookEntry, current_user: User = Depends(get_current_user)):
    existing = db.get_item(entry_id, 'lorebook_entries')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
    
    entry.id = entry_id
    entry.user_id = current_user.id
    db.update_item(entry_id, entry, 'lorebook_entries')
    return entry

@app.delete("/lorebook/{entry_id}")
async def delete_lorebook_entry(entry_id: str, current_user: User = Depends(get_current_user)):
    existing = db.get_item(entry_id, 'lorebook_entries')
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lorebook entry not found")
    
    db.delete_item(entry_id, 'lorebook_entries')
    return {"message": "Lorebook entry deleted"}

@app.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    file_id = str(uuid.uuid4())
    file_path = f"/tmp/{file_id}_{file.filename}"
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    file_info = {
        "id": file_id,
        "filename": file.filename,
        "file_path": file_path,
        "content_type": file.content_type,
        "size": len(content),
        "user_id": current_user.id
    }
    
    db.uploaded_files[file_id] = file_info
    
    return FileUploadResponse(
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        size=len(content)
    )

@app.post("/generate", response_model=GeneratorOutput)
async def generate_content(request: GenerateRequest, current_user: User = Depends(get_current_user)):
    try:
        result = await ai_service.generate_content(
            prompt=request.prompt,
            mcp_config_id=request.mcpConfigId,
            files=request.files,
            user_id=current_user.id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/chat")
async def chat(request: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        conversation_id = request.conversation_id
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conversation = Conversation(
                id=conversation_id,
                title=f"對話 - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                messages=[],
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                user_id=current_user.id
            )
            db.add_item(conversation, 'conversations')
        
        conversation = db.get_item(conversation_id, 'conversations')
        if not conversation or conversation.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        user_message = ChatMessage(
            id=str(uuid.uuid4()),
            content=request.message,
            role="user",
            timestamp=datetime.now().isoformat(),
            attachments=[]
        )
        
        ai_response_text = await ai_service.chat_response(request.message, conversation.messages)
        
        ai_message = ChatMessage(
            id=str(uuid.uuid4()),
            content=ai_response_text,
            role="assistant",
            timestamp=datetime.now().isoformat(),
            attachments=[]
        )
        
        conversation.messages.extend([user_message, ai_message])
        conversation.updated_at = datetime.now().isoformat()
        db.update_item(conversation_id, conversation, 'conversations')
        
        return {
            "conversation_id": conversation_id,
            "message": ai_message,
            "conversation": conversation
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@app.get("/ai/detect-models")
async def detect_available_models(current_user: User = Depends(get_current_user)):
    """Auto-detect available AI models based on configured providers"""
    try:
        user_model_configs = db.get_user_data(current_user.id, 'model_configs')
        
        detected_models = []
        provider_status = {}
        
        for config in user_model_configs:
            provider = config.provider
            if provider not in provider_status:
                provider_status[provider] = {
                    "available": bool(config.api_key and config.api_key.strip()),
                    "models": [],
                    "status": "configured" if config.api_key else "missing_api_key"
                }
            
            if provider_status[provider]["available"]:
                provider_status[provider]["models"].append({
                    "id": config.id,
                    "name": config.name,
                    "model": config.model,
                    "capabilities": _get_model_capabilities(provider, config.model)
                })
                detected_models.append(config.id)
        
        return {
            "detected_models": detected_models,
            "provider_status": provider_status,
            "total_available": len(detected_models),
            "recommendations": _get_model_recommendations(provider_status)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model detection failed: {str(e)}")

def _get_model_capabilities(provider: str, model: str) -> List[str]:
    """Get capabilities for a specific model"""
    capabilities_map = {
        "google": {
            "gemini-pro": ["text", "creative", "analysis"],
            "gemini-pro-vision": ["text", "image", "vision", "creative"],
            "gemini-1.5-pro": ["text", "image", "video", "audio", "creative", "analysis"],
            "gemini-1.5-flash": ["text", "image", "video", "creative"]
        },
        "openai": {
            "gpt-4o": ["text", "image", "vision", "creative", "analysis"],
            "gpt-4-turbo": ["text", "creative", "analysis"],
            "gpt-3.5-turbo": ["text", "dialogue"],
            "whisper-1": ["audio", "transcription"]
        },
        "anthropic": {
            "claude-3-opus": ["text", "creative", "analysis", "emotional"],
            "claude-3-sonnet": ["text", "creative", "analysis"],
            "claude-3-haiku": ["text", "dialogue"]
        }
    }
    
    provider_models = capabilities_map.get(provider, {})
    model_lower = model.lower()
    
    for model_name, capabilities in provider_models.items():
        if model_name.lower() in model_lower or model_lower in model_name.lower():
            return capabilities
    
    return ["text"]

def _get_model_recommendations(provider_status: dict) -> List[str]:
    """Get recommendations for missing or additional models"""
    recommendations = []
    
    available_providers = [p for p, status in provider_status.items() if status["available"]]
    
    if not available_providers:
        recommendations.append("請至少配置一個AI提供商的API密鑰")
    
    if "google" not in available_providers:
        recommendations.append("建議配置Google AI (Gemini)以獲得最佳多媒體支援")
    
    if "anthropic" not in available_providers:
        recommendations.append("建議配置Anthropic (Claude)以獲得優秀的創意寫作能力")
    
    if "openai" not in available_providers:
        recommendations.append("建議配置OpenAI (GPT)以獲得廣泛的模型選擇")
    
    return recommendations
