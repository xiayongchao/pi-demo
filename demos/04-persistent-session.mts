#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: 使用文件保存记忆
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
import * as path from 'path';
import * as fs from 'fs';


async function main() {
  console.log('=== pi-coding-agent Demo (文件保存记忆) ===\n');

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

  // ========== 4. 配置会话持久化 ==========
  const sessionsDir = path.join(process.cwd(), '.pi-sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  
  const sessionFile = path.join(sessionsDir, 'assistant.jsonl');
  console.log('会话文件:', sessionFile);
  
  // 方式1: SessionManager.open() - 打开或创建会话文件
  const sessionManager = SessionManager.open(sessionFile);
  
  // 方式2: 也可以使用 SessionManager.create() 创建新会话
  // const sessionManager = SessionManager.create(process.cwd());
  
  // 方式3: SessionManager.continueRecent() - 继续最近的会话
  // const sessionManager = SessionManager.continueRecent(process.cwd());

  // ========== 5. 创建会话 ==========
  const { session } = await createAgentSession({
    authStorage: AuthStorage.inMemory({ 
      qwen: { type: 'api_key', key: apiKey } 
    }),
    model,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager,
  });

  console.log('会话创建成功!\n');

  // ========== 6. 订阅事件 ==========
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

  // ========== 7. 对话测试 ==========

  console.log('--- 测试 1: 简单问答 ---');
  fullResponse = '';
  await session.prompt('你好，我叫张三，请记住我的名字');
  console.log('\n回复:', fullResponse);

  console.log('\n--- 测试 2: 验证记忆 ---');
  fullResponse = '';
  await session.prompt('请告诉我你还记得我叫什么吗？');
  console.log('\n回复:', fullResponse);

  console.log('\n--- 测试 3: 关闭并重新打开会话 ---');
  console.log('检查会话文件内容:');
  const sessionContent = fs.readFileSync(sessionFile, 'utf-8');
  console.log(sessionContent.split('\n').filter(l => l.trim()).length, '行');
  
  // 创建一个新的会话实例，使用相同的会话文件
  console.log('\n重新创建会话...');
  const { session: session2 } = await createAgentSession({
    authStorage: AuthStorage.inMemory({ 
      qwen: { type: 'api_key', key: apiKey } 
    }),
    model,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: SessionManager.open(sessionFile),
  });

  let fullResponse2 = '';
  session2.subscribe((event) => {
    if ('assistantMessageEvent' in event && event.assistantMessageEvent?.type === 'text_delta') {
      process.stdout.write(event.assistantMessageEvent.delta);
      fullResponse2 += event.assistantMessageEvent.delta;
    }
  });

  console.log('\n--- 测试 4: 验证历史记忆 ---');
  fullResponse2 = '';
  await session2.prompt('请问我第一次跟你对话时告诉你我的名字是什么？');
  console.log('\n回复:', fullResponse2);

  console.log('\n[Demo 完成]');
  console.log('会话已保存到:', sessionFile);
}

main();