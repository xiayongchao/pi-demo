#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: Steering 引导
// ========================================

import { 
  createAgentSession, 
  AuthStorage, 
  SessionManager,
  readTool,
  writeTool, 
  bashTool, 
  lsTool,
} from '@mariozechner/pi-coding-agent';
import * as path from 'path';
import * as fs from 'fs';


async function main() {
  console.log('=== pi-coding-agent Demo (Steering 引导) ===\n');

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

  // ========== 4. Steering 演示 ==========
  
  const steerDir = path.join(cwd, '.pi-sessions', 'steering-demo');
  fs.mkdirSync(steerDir, { recursive: true });
  const sessionFile = path.join(steerDir, 'session.jsonl');

  console.log('--- 创建 Agent 会话 ---');
  
  const { session } = await createAgentSession({
    model,
    authStorage,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: SessionManager.open(sessionFile),
  });

  let fullResponse = '';
  let turnCount = 0;
  
  session.subscribe((event) => {
    switch (event.type) {
      case 'agent_start':
        turnCount++;
        console.log(`\n=== Turn ${turnCount} ===`);
        break;
      case 'message_update':
        if ('assistantMessageEvent' in event && event.assistantMessageEvent?.type === 'text_delta') {
          process.stdout.write(event.assistantMessageEvent.delta);
          fullResponse += event.assistantMessageEvent.delta;
        }
        break;
      case 'tool_execution_start':
        console.log('\n[工具调用]', event.toolName, event.args);
        break;
      case 'tool_execution_end':
        console.log('[工具完成]', event.toolName);
        break;
      case 'turn_end':
        console.log('\n');
        break;
    }
  });

  // 演示 1: 正常对话
  console.log('>>> Turn 1: 正常对话');
  fullResponse = '';
  await session.prompt('请先读取当前目录的文件列表');
  console.log();

  // 演示 2: steer - 中断并重定向
  console.log('>>> Turn 2: 使用 steer 中断并重定向');
  console.log('  (中断当前工作，跳过工具调用，直接执行新指令)');
  
  // steer 会中断当前执行，跳过剩余工具，注入新消息
  await session.steer('其实不用读取文件了，直接告诉我 1+1 等于几？');
  console.log();

  // 演示 3: followUp - 排队等待
  console.log('>>> Turn 3: 使用 followUp 排队等待');
  console.log('  (不中断当前工作，排队等待处理)');
  
  // followUp 会等待当前工作完成后处理
  await session.followUp('之后请告诉我 2+2 等于几？');
  
  // 继续当前对话
  fullResponse = '';
  await session.prompt('好的，继续刚才的任务，列出目录');
  console.log();

  // 演示 4: 查看消息历史
  console.log('--- 消息历史 ---');
  const messages = session.messages || [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as any;
    const role = msg.role;
    const content = msg.content?.[0]?.type === 'text' 
      ? msg.content[0].text?.substring(0, 50) + '...'
      : '[非文本]';
    console.log(`  ${i + 1}. ${role}: ${content}`);
  }

  console.log('\n[Demo 完成]');
  console.log('Steering 功能:');
  console.log('  - steer(): 中断当前工作，跳过剩余工具，注入新消息');
  console.log('  - followUp(): 排队等待，当前工作完成后处理');
  console.log('\n使用场景:');
  console.log('  - 用户在 Agent工作时输入新消息');
  console.log('  - 程序化链接多个任务');
}

main().catch(console.error);
