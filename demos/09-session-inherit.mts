#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: 手动继承父会话消息
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
  console.log('=== pi-coding-agent Demo (手动继承父会话消息) ===\n');

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
  console.log('工作目录:', cwd);
  console.log();

  // ========== 4. 手动继承父会话演示 ==========
  
  const inheritDir = path.join(cwd, '.pi-sessions', 'inherit-demo');
  fs.mkdirSync(inheritDir, { recursive: true });

  // === 第一步：创建父会话并对话 ===
  console.log('--- 步骤 1: 创建父会话 ---');
  const parentSessionFile = path.join(inheritDir, 'parent.jsonl');
  const parentSessionManager = SessionManager.open(parentSessionFile);
  console.log('父会话 ID:', parentSessionManager.getSessionId());

  const { session: parentSession } = await createAgentSession({
    model,
    authStorage,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: parentSessionManager,
  });

  let fullResponse = '';
  parentSession.subscribe((event) => {
    switch (event.type) {
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

  console.log('>>> 父会话: 我叫张三');
  fullResponse = '';
  await parentSession.prompt('我叫张三');
  console.log();

  console.log('>>> 父会话: 我今年30岁');
  fullResponse = '';
  await parentSession.prompt('我今年30岁');
  console.log();

  // 获取父会话的所有消息
  const parentEntries = parentSessionManager.getEntries();
  console.log('父会话消息数:', parentEntries.length);
  console.log();

  // === 第二步：创建子会话并手动继承父会话消息 ===
  console.log('--- 步骤 2: 创建子会话并继承父会话消息 ---');
  
  const childSessionFile = path.join(inheritDir, 'child-inherit.jsonl');
  const childSessionManager = SessionManager.open(childSessionFile);
  console.log('子会话 ID:', childSessionManager.getSessionId());

  // 手动复制父会话的消息到子会话
  // 注意：需要过滤出 message 类型的 entry
  for (const entry of parentEntries) {
    if (entry.type === 'message') {
      // 使用 appendMessage 复制消息
      // 注意：这里需要从 entry 中提取 message 内容
      const message = (entry as any).message;
      if (message) {
        childSessionManager.appendMessage(message);
      }
    } else if (entry.type === 'model_change') {
      childSessionManager.appendModelChange(
        (entry as any).provider,
        (entry as any).modelId
      );
    } else if (entry.type === 'thinking_level_change') {
      childSessionManager.appendThinkingLevelChange((entry as any).thinkingLevel);
    }
  }
  
  console.log('已复制父会话消息到子会话');
  console.log('子会话消息数:', childSessionManager.getEntries().length);
  console.log();

  // === 第三步：子会话对话（验证继承） ===
  console.log('--- 步骤 3: 子会话对话（验证继承） ---');
  
  const { session: childSession } = await createAgentSession({
    model,
    authStorage,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: childSessionManager,
  });

  let childResponse = '';
  childSession.subscribe((event) => {
    switch (event.type) {
      case 'message_update':
        if ('assistantMessageEvent' in event && event.assistantMessageEvent?.type === 'text_delta') {
          process.stdout.write(event.assistantMessageEvent.delta);
          childResponse += event.assistantMessageEvent.delta;
        }
        break;
      case 'turn_end':
        console.log('\n');
        break;
    }
  });

  // 子会话询问继承的信息
  console.log('>>> 子会话: 我叫什么名字？');
  childResponse = '';
  await childSession.prompt('我叫什么名字？');
  console.log();

  console.log('>>> 子会话: 我今年多大？');
  childResponse = '';
  await childSession.prompt('我今年多大？');
  console.log();

  // 查看子会话的消息
  console.log('--- 子会话消息 ---');
  const childEntries = childSessionManager.getEntries();
  console.log('子会话消息数:', childEntries.length);
  for (const entry of childEntries) {
    const type = entry.type;
    const id = entry.id.substring(0, 8);
    console.log(`  - ${type}: ${id}...`);
  }

  console.log('\n[Demo 完成]');
  console.log('手动继承: 通过遍历父会话的 entries，手动复制到子会话');
}

main().catch(console.error);
