#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: Thinking Levels 扩展思考
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
  console.log('=== pi-coding-agent Demo (Thinking Levels 扩展思考) ===\n');

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

  // ========== 4. Thinking Levels 演示 ==========
  
  const thinkingDir = path.join(cwd, '.pi-sessions', 'thinking-demo');
  fs.mkdirSync(thinkingDir, { recursive: true });
  const sessionFile = path.join(thinkingDir, 'session.jsonl');

  console.log('--- 思考层级说明 ---');
  console.log('Thinking Levels 控制模型的扩展思考能力:');
  console.log('  - off: 禁用扩展思考');
  console.log('  - minimal: 最少思考');
  console.log('  - low: 低水平思考');
  console.log('  - medium: 中等思考 (默认)');
  console.log('  - high: 高水平思考');
  console.log('  - xhigh: 极高水平思考');
  console.log();

  // 创建会话，设置 thinkingLevel
  console.log('--- 创建 Agent 会话 (thinkingLevel: off) ---');
  
  const { session } = await createAgentSession({
    model,
    authStorage,
    thinkingLevel: 'off',  // 禁用扩展思考
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: SessionManager.open(sessionFile),
  });

  let fullResponse = '';
  
  session.subscribe((event) => {
    switch (event.type) {
      case 'message_update':
        // 检查 thinking_delta 事件
        if ('assistantMessageEvent' in event) {
          const assistantEvent = event.assistantMessageEvent;
          if (assistantEvent.type === 'thinking_delta') {
            process.stdout.write('[思考] ' + (assistantEvent as any).delta);
          } else if (assistantEvent.type === 'text_delta') {
            process.stdout.write(assistantEvent.delta);
            fullResponse += assistantEvent.delta;
          }
        }
        break;
      case 'turn_end':
        console.log('\n');
        break;
    }
  });

  // 对话测试 1: thinkingLevel = off
  console.log('>>> thinkingLevel: off');
  console.log('>>> 用户: 计算 25 * 17 = ?');
  fullResponse = '';
  await session.prompt('计算 25 * 17 = ?');
  console.log();

  // 动态切换 thinking level
  console.log('--- 切换 thinkingLevel 为 high ---');
  session.setThinkingLevel('high');
  console.log('当前 thinkingLevel: high');
  console.log();

  // 对话测试 2: thinkingLevel = high
  console.log('>>> thinkingLevel: high');
  console.log('>>> 用户: 解释一下为什么天空是蓝色的？');
  fullResponse = '';
  await session.prompt('用一句话解释为什么天空是蓝色的？');
  console.log();

  // 再次切换
  console.log('--- 切换 thinkingLevel 为 medium ---');
  session.setThinkingLevel('medium');
  console.log();

  // 对话测试 3
  console.log('>>> thinkingLevel: medium');
  console.log('>>> 用户: 给我讲个笑话');
  fullResponse = '';
  await session.prompt('给我讲个短笑话');
  console.log();

  // 查看当前状态
  console.log('--- 当前会话状态 ---');
  console.log('消息数:', session.messages?.length || 0);

  console.log('\n[Demo 完成]');
  console.log('Thinking Levels 功能:');
  console.log('  - 初始化时设置: createAgentSession({ thinkingLevel })');
  console.log('  - 运行时切换: session.setThinkingLevel(level)');
  console.log('  - 支持级别: off, minimal, low, medium, high, xhigh');
  console.log('\n注意: 部分模型可能不支持所有思考层级');
}

main().catch(console.error);
