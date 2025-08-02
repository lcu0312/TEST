#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append('/home/ubuntu/mirroverse-backend')

from app.engine_modules import OpenAIProvider
from app.models import ModelConfig
from app.database import database

async def test_openai_integration():
    print("=== OpenAI Integration Test ===")
    
    default_model = database.model_configs.get('default_model')
    if not default_model:
        print("ERROR: No default model found in database!")
        return False
    
    print(f"Testing with model: {default_model.name}")
    print(f"Provider: {default_model.provider}")
    print(f"Model: {default_model.model}")
    print(f"API key (first 20 chars): {default_model.api_key[:20]}...")
    
    provider = OpenAIProvider()
    
    try:
        print("\nTesting OpenAI text generation...")
        result = await provider.generate_text(
            "創造一個關於勇敢騎士的簡短故事", 
            default_model
        )
        
        print(f"Result: {result[:100]}...")
        
        if '[API暫時不可用]' in result:
            print("❌ FAILED: Still returning mock response")
            return False
        else:
            print("✅ SUCCESS: Real OpenAI API response received")
            return True
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_openai_integration())
    exit(0 if success else 1)
