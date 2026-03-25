#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: Compaction 压缩
// ========================================

import { 
  createAgentSession, 
  AuthStorage, 
  SessionManager,
  readTool,
  writeTool, 
  bashTool, 
  lsTool,
  estimateTokens,
} from '@mariozechner/pi-coding-agent';
import * as path from 'path';
import * as fs from 'fs';


async function main() {
  console.log('=== pi-coding-agent Demo (Compaction 压缩) ===\n');

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
  console.log('上下文窗口:', model.contextWindow, 'tokens');
  console.log();

  // ========== 4. Compaction 演示 ==========
  
  const compactDir = path.join(cwd, '.pi-sessions', 'compaction-demo');
  fs.mkdirSync(compactDir, { recursive: true });
  const sessionFile = path.join(compactDir, 'session.jsonl');

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
      case 'auto_compaction_start':
        console.log('[压缩开始] 上下文即将被压缩');
        break;
      case 'auto_compaction_end':
        console.log('[压缩结束] 上下文已压缩');
        break;
      case 'message_update':
        if ('assistantMessageEvent' in event && event.assistantMessageEvent?.type === 'text_delta') {
          process.stdout.write(event.assistantMessageEvent.delta);
          fullResponse += event.assistantMessageEvent.delta;
        }
        break;
      case 'turn_end':
        console.log('\n');
        break;
    }
  });

  // 对话 1: 多次对话以累积上下文
  console.log('>>> 对话 1: 你好');
  fullResponse = '';
  await session.prompt('你好，我叫张三');
  printTokenCount(session);

  console.log('>>> 对话 2: 我的名字是什么？');
  fullResponse = '';
  await session.prompt('我叫什么名字？');
  printTokenCount(session);

  console.log('>>> 对话 3: 我喜欢苹果');
  fullResponse = '';
  await session.prompt('我喜欢吃苹果');
  printTokenCount(session);

  console.log('>>> 对话 4: 我喜欢什么水果？');
  fullResponse = '';
  await session.prompt('我最喜欢什么水果？');
  printTokenCount(session);

  console.log('>>> 对话 5: 计算 1+1');
  fullResponse = '';
  await session.prompt('1+1 等于多少？');
  printTokenCount(session);

  console.log('>>> 对话 6: 再计算 2+2');
  fullResponse = '';
  await session.prompt('2+2 等于多少？');
  printTokenCount(session);

  // 手动触发压缩
  console.log('--- 手动触发压缩 ---');
  console.log('>>> 用户: 请压缩上下文');
  await session.compact('保留所有关于用户名字和喜好的信息');
  printTokenCount(session);

  console.log('>>> 对话 7: 我还叫什么？');
  fullResponse = '';
  await session.prompt('我还叫什么名字？');

  // 查看会话文件
  console.log('\n--- 查看会话文件 ---');
  const sessionManager = session.sessionManager;
  const entries = sessionManager.getEntries();
  console.log('会话条目数:', entries.length);
  
  // 统计各类条目
  const entryTypes = {} as Record<string, number>;
  for (const entry of entries) {
    entryTypes[entry.type] = (entryTypes[entry.type] || 0) + 1;
  }
  console.log('条目类型统计:', entryTypes);

  console.log('\n[Demo 完成]');
  console.log('Compaction 功能:');
  console.log('  - 自动压缩: 当上下文接近窗口限制时自动触发');
  console.log('  - 手动压缩: session.compact(customInstructions)');
  console.log('  - 压缩保留: 摘要会保留关键信息');
  console.log('  - 原始记录: JSONL 文件保留完整历史');
}

function printTokenCount(session: any) {
  const messages = session.messages || [];
  const totalTokens = messages.reduce((sum: number, msg: any) => sum + estimateTokens(msg), 0);
  console.log('  当前 token 数:', totalTokens);
}

main().catch(console.error);
