#!/usr/bin/env python3
import asyncio
import sys
import os
sys.path.append('/home/ubuntu/mirroverse-backend')

from app.engine_modules import engine
from app.database import database

async def test_mcp_pipeline():
    print("=== MCP Pipeline Test ===")
    
    mcp_config = database.mcp_configs.get('echo-board')
    if not mcp_config:
        print("ERROR: No echo-board MCP found!")
        return False
    
    print(f"Testing MCP: {mcp_config.name}")
    print(f"Steps: {len(mcp_config.steps)}")
    
    try:
        print("\nExecuting MCP pipeline...")
        result = await engine.execute_mcp_pipeline(
            mcp_config, 
            "創造一個關於勇敢騎士的故事", 
            "default"
        )
        
        print(f"Narrative: {result.narrative[:100]}...")
        print(f"Story Graph nodes: {len(result.storyGraph.nodes)}")
        
        if '[API暫時不可用]' in result.narrative:
            print("❌ FAILED: Still returning mock response")
            return False
        else:
            print("✅ SUCCESS: Real AI-generated MCP pipeline result")
            return True
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_mcp_pipeline())
    exit(0 if success else 1)
