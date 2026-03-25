#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: Parent Session 父子会话继承
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
  console.log('=== pi-coding-agent Demo (Parent Session 父子会话继承) ===\n');

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

  // ========== 4. Parent Session 演示 ==========
  
  // 准备父子会话目录
  const parentDir = path.join(cwd, '.pi-sessions', 'parent-demo');
  fs.mkdirSync(parentDir, { recursive: true });

  // === 第一步：创建父会话 ===
  console.log('--- 步骤 1: 创建父会话 ---');
  const parentSessionFile = path.join(parentDir, 'parent.jsonl');
  
  // 使用 SessionManager.open 创建父会话
  const parentSessionManager = SessionManager.open(parentSessionFile);
  console.log('父会话 ID:', parentSessionManager.getSessionId());
  console.log('父会话文件:', parentSessionManager.getSessionFile());

  // 创建父会话的 Agent
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

  // 父会话对话：告诉 agent 一些信息
  console.log('>>> 父会话: 我喜欢的水果是苹果');
  fullResponse = '';
  await parentSession.prompt('我喜欢的水果是苹果，请记住');
  console.log();

  console.log('>>> 父会话: 我最喜欢的颜色是蓝色');
  fullResponse = '';
  await parentSession.prompt('我最喜欢的颜色是蓝色，请记住');
  console.log();

  // 获取父会话的头部信息
  const parentHeader = parentSessionManager.getHeader();
  console.log('父会话消息数:', parentSessionManager.getEntries().length);
  console.log();

  // === 第二步：创建子会话，继承父会话 ===
  console.log('--- 步骤 2: 创建子会话，继承父会话 ---');
  
  // 使用 newSession 方法创建新会话，并指定父会话
  const childSessionFile = path.join(parentDir, 'child.jsonl');
  const childSessionManager = SessionManager.open(childSessionFile);
  
  // 设置父会话引用
  childSessionManager.newSession({
    parentSession: parentSessionFile  // 指向父会话文件
  });
  
  console.log('子会话 ID:', childSessionManager.getSessionId());
  console.log('子会话文件:', childSessionManager.getSessionFile());
  
  // 查看子会话的头部信息
  const childHeader = childSessionManager.getHeader();
  console.log('子会话父会话:', childHeader?.parentSession);
  console.log();

  // === 第三步：子会话对话 ===
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
  console.log('>>> 子会话: 我喜欢什么水果？');
  childResponse = '';
  await childSession.prompt('我喜欢什么水果？');
  console.log();

  console.log('>>> 子会话: 我最喜欢什么颜色？');
  childResponse = '';
  await childSession.prompt('我最喜欢什么颜色？');
  console.log();

  // 查看子会话的消息
  console.log('--- 子会话消息 ---');
  const childEntries = childSessionManager.getEntries();
  console.log('子会话消息数:', childEntries.length);
  for (const entry of childEntries) {
    console.log(`  - ${entry.type}: ${entry.id.substring(0, 8)}...`);
  }

  console.log('\n[Demo 完成]');
  console.log('Parent Session 功能: 新会话可以继承父会话的历史上下文');
}

main().catch(console.error);
