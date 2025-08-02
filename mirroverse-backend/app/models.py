from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class User(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    created_at: str
    preferences: Dict[str, Any] = {}

class ModelConfig(BaseModel):
    id: str
    name: str
    provider: str
    model: str
    api_key: str
    endpoint: Optional[str] = None
    parameters: Dict[str, Any] = {}
    user_id: str

class MCPStep(BaseModel):
    id: str
    name: str
    modelId: str
    promptTemplate: str
    externalConnector: Optional[str] = None

class MCPConfig(BaseModel):
    id: str
    name: str
    steps: List[MCPStep]
    externalConnectors: Optional[List[Dict[str, Any]]] = []

class Choice(BaseModel):
    id: str
    text: str
    nextNodeId: Optional[str] = None

class StoryNode(BaseModel):
    id: str
    imagePrompt: str
    subtitle: str
    narration: str
    imageUrl: Optional[str] = None
    choices: List[Choice] = []

class StoryGraph(BaseModel):
    nodes: List[StoryNode]
    startNodeId: str

class GeneratorOutput(BaseModel):
    narrative: str
    storyGraph: StoryGraph
    code: str

class SavedCreation(BaseModel):
    id: str
    title: str
    created_at: str
    thumbnail_url: str
    output: GeneratorOutput
    user_id: str

class ChatMessage(BaseModel):
    id: str
    content: str
    role: str
    timestamp: str
    attachments: List[Dict[str, Any]] = []

class Conversation(BaseModel):
    id: str
    title: str
    messages: List[ChatMessage]
    created_at: str
    updated_at: str
    user_id: str

class LorebookEntry(BaseModel):
    id: str
    title: str
    content: str
    tags: List[str] = []
    created_at: str
    user_id: str

class ExternalServiceConnector(BaseModel):
    id: str
    name: str
    service_type: str
    config: Dict[str, Any]
    is_active: bool
    user_id: str

class FileUploadResponse(BaseModel):
    filename: str
    file_path: str
    content_type: str
    size: int

class LoginRequest(BaseModel):
    username: str

class LoginResponse(BaseModel):
    session_token: str
    user: User

class LogoutRequest(BaseModel):
    session_token: str

class GenerateRequest(BaseModel):
    prompt: str
    mcpConfigId: Optional[str] = None
    files: List[Dict[str, Any]] = []

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
