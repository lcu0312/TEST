import sys
import os
import asyncio
sys.path.append('.')

os.environ["GOOGLE_API_KEY"] = "test_key_for_mounting_verification"
os.environ["OPENAI_API_KEY"] = "test_key_for_mounting_verification"

from app.database import database as db
from app.engine_modules import engine
from app.ai_service import AIService

async def test_ai_mounting_with_env():
    print('=== AI Model Mounting Test with Environment Variables ===')
    
    print(f'Environment variables set:')
    print(f'  GOOGLE_API_KEY: {"Set" if os.getenv("GOOGLE_API_KEY") else "Not set"}')
    print(f'  OPENAI_API_KEY: {"Set" if os.getenv("OPENAI_API_KEY") else "Not set"}')
    
    print(f'\nModel configs after environment setup:')
    for config_id, config in db.model_configs.items():
        print(f'  - {config.name} ({config.provider}): API key length = {len(config.api_key) if config.api_key else 0}')
    
    print(f'\nTesting AI Service initialization with Meta-Level Correction Protocol...')
    try:
        ai_service = AIService()
        print(f'✅ AIService initialized successfully')
        print(f'   Construction contexts: {hasattr(ai_service, "construction_contexts")}')
        print(f'   Module development history: {hasattr(ai_service, "module_development_history")}')
        print(f'   Meta-correction protocol: {hasattr(ai_service, "meta_correction")}')
    except Exception as e:
        print(f'❌ AIService initialization failed: {str(e)}')
        return False
    
    print(f'\nTesting MCP pipeline execution...')
    test_prompt = "創建一個科幻故事場景，包含未來城市和機器人角色"
    
    echo_board_mcp = db.mcp_configs.get('echo-board')
    if echo_board_mcp:
        try:
            print(f'Testing {echo_board_mcp.name}...')
            result = await engine.execute_mcp_pipeline(
                echo_board_mcp, 
                test_prompt, 
                "default_user"
            )
            
            if result:
                print(f'✅ MCP pipeline executed successfully')
                print(f'   Result type: {type(result)}')
                if hasattr(result, 'content'):
                    print(f'   Content length: {len(result.content) if result.content else 0}')
                elif hasattr(result, 'narrative'):
                    print(f'   Narrative length: {len(result.narrative) if result.narrative else 0}')
                else:
                    print(f'   Result preview: {str(result)[:100]}...')
                return True
            else:
                print(f'⚠️  MCP pipeline returned empty result')
                return False
                
        except Exception as e:
            print(f'❌ MCP pipeline execution failed: {str(e)}')
            return False
    else:
        print(f'❌ EchoBoard MCP configuration not found')
        return False

if __name__ == "__main__":
    success = asyncio.run(test_ai_mounting_with_env())
    print(f'\n{"🎉 AI mounting test with environment PASSED!" if success else "❌ AI mounting test with environment FAILED!"}')
