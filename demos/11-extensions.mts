#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: Extensions 扩展
// ========================================

import { 
  createAgentSession, 
  AuthStorage, 
  SessionManager,
  readTool,
  writeTool, 
  bashTool, 
  lsTool,
  type ExtensionAPI,
} from '@mariozechner/pi-coding-agent';
import * as path from 'path';
import * as fs from 'fs';


async function main() {
  console.log('=== pi-coding-agent Demo (Extensions 扩展) ===\n');

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

  const authStorage = AuthStorage.inMemory({ qwen: { type: 'api_key', key: apiKey } });
  const cwd = process.cwd();

  console.log('模型:', model.id);
  console.log();

  // ========== 4. Extensions 演示 ==========
  
  const extDir = path.join(cwd, '.pi-sessions', 'extension-demo');
  fs.mkdirSync(extDir, { recursive: true });
  const sessionFile = path.join(extDir, 'session.jsonl');

  // ========== 5. 创建 Agent 会话 ==========
  console.log('--- 创建 Agent 会话 ---');
  
  const { session } = await createAgentSession({
    model,
    authStorage,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: SessionManager.open(sessionFile),
  });

  let fullResponse = '';
  session.subscribe((event) => {
    switch (event.type) {
      case 'agent_start':
        console.log('[Agent 启动]');
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
        console.log('\n');
        break;
    }
  });

  // 对话测试
  console.log('>>> 用户: 你好');
  fullResponse = '';
  await session.prompt('你好');
  console.log();

  console.log('>>> 用户: 列出当前目录文件');
  fullResponse = '';
  await session.prompt('列出当前目录的文件');
  console.log();

  // 获取会话统计
  const stats = session.getSessionStats();
  console.log('--- 会话统计 ---');
  console.log('会话 ID:', stats.sessionId);
  console.log('用户消息:', stats.userMessages);
  console.log('助手消息:', stats.assistantMessages);
  console.log('工具调用:', stats.toolCalls);
  console.log('总消息数:', stats.totalMessages);
  console.log('输入 token:', stats.tokens.input);
  console.log('输出 token:', stats.tokens.output);
  console.log();

  console.log('\n[Demo 完成]');
  console.log('Extensions 扩展说明:');
  console.log('  Extensions 允许在 Agent 运行时修改行为');
  console.log('  关键事件:');
  console.log('    - context: 发送消息给 LLM 之前');
  console.log('    - session_before_compact: 压缩之前');
  console.log('    - tool_call: 工具调用时');
  console.log('    - session_start/session_switch: 会话事件');
  console.log('  实际使用需通过 setup 函数加载扩展文件');
}

main().catch(console.error);
