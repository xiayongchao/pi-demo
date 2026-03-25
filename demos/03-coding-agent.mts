#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: 使用千问模型
// ========================================

import { 
  createAgentSession, 
  AuthStorage, 
  SessionManager,
  readTool,
  writeTool, 
  bashTool, 
  lsTool 
} from '@mariozechner/pi-coding-agent';


async function main() {
  console.log('=== pi-coding-agent Demo (千问模型) ===\n');

  // ========== 1. SSL 修复 ==========
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // ========== 2. 检查 API Key ==========
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.error('请设置 QWEN_API_KEY');
    process.exit(1);
  }
  console.log('API Key:', apiKey.substring(0, 10) + '...\n');

  // ========== 3. 配置千问模型 ==========
  const model = {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    provider: 'qwen',
    api: 'openai-completions' as const,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    input: ['text'] as const,
    output: ['text'] as const,
    reasoning: false,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 131072,
    maxTokens: 8192,
  } as any;

  console.log('模型:', model.id);
  console.log('API 地址:', model.baseUrl, '\n');

  // ========== 4. 创建会话 ==========
  const { session } = await createAgentSession({
    authStorage: AuthStorage.inMemory({ 
      qwen: { type: 'api_key', key: apiKey } 
    }),
    model,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: SessionManager.inMemory(),
  });

  console.log('会话创建成功!\n');

  // ========== 5. 订阅事件 ==========
  let fullResponse = '';

  session.subscribe((event) => {
    switch (event.type) {
      case 'agent_start':
        console.log('[Agent 启动]');
        break;
      case 'turn_start':
        console.log('[对话开始]');
        break;
      case 'message_update':
        if ('assistantMessageEvent' in event && event.assistantMessageEvent?.type === 'text_delta') {
          process.stdout.write(event.assistantMessageEvent.delta);
          fullResponse += event.assistantMessageEvent.delta;
        }
        break;
      case 'tool_execution_start':
        console.log('\n[工具调用]', event.toolName);
        break;
      case 'tool_execution_end':
        console.log('[工具完成]', event.toolName);
        break;
      case 'turn_end':
        console.log('\n[对话结束]');
        break;
      case 'agent_end':
        console.log('[Agent 结束]');
        break;
    }
  });

  // ========== 6. 对话测试 ==========

  console.log('--- 测试 1: 简单问答 ---');
  fullResponse = '';
  await session.prompt('你好，用中文介绍自己');
  console.log('\n回复:', fullResponse);

  console.log('\n--- 测试 2: 执行命令 ---');
  fullResponse = '';
  await session.prompt('执行 echo hello');
  console.log('\n回复:', fullResponse);

  console.log('\n[Demo 完成]');
}

main();
