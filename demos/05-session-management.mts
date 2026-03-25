#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: 会话管理与关联
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
  console.log('=== pi-coding-agent Demo (会话管理) ===\n');

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

  // ========== 4. SessionManager 的多种用法 ==========
  
  // 方法 1: create(cwd) - 创建新会话
  // 会话文件保存在 ~/.pi/agent/sessions/<encoded-cwd>/ 目录下
  console.log('--- 方法 1: SessionManager.create() 创建新会话 ---');
  const sessionManager1 = SessionManager.create(cwd);
  console.log('会话目录:', sessionManager1.getSessionDir());
  console.log('会话 ID:', sessionManager1.getSessionId());
  console.log();

  // 方法 2: open(path) - 打开指定会话文件
  // 可以打开已有的会话文件继续对话
  console.log('--- 方法 2: SessionManager.open() 打开指定会话 ---');
  const sessionFile = path.join(cwd, '.pi-sessions', 'assistant.jsonl');
  if (fs.existsSync(sessionFile)) {
    const sessionManager2 = SessionManager.open(sessionFile);
    console.log('会话文件:', sessionManager2.getSessionFile());
    console.log('会话 ID:', sessionManager2.getSessionId());
    console.log();
  } else {
    console.log('会话文件不存在，跳过...\n');
  }

  // 方法 3: continueRecent(cwd) - 继续最近的会话
  // 如果没有会话则创建新的
  console.log('--- 方法 3: SessionManager.continueRecent() 继续最近会话 ---');
  const sessionManager3 = SessionManager.continueRecent(cwd);
  console.log('会话目录:', sessionManager3.getSessionDir());
  console.log('会话 ID:', sessionManager3.getSessionId());
  console.log();

  // 方法 4: inMemory(cwd) - 内存会话（不持久化）
  console.log('--- 方法 4: SessionManager.inMemory() 内存会话 ---');
  const sessionManager4 = SessionManager.inMemory(cwd);
  console.log('会话 ID:', sessionManager4.getSessionId());
  console.log();

  // ========== 5. 列出所有会话 ==========
  console.log('--- 列出所有会话 ---');
  const sessions = await SessionManager.listAll();
  console.log(`共 ${sessions.length} 个会话:\n`);
  for (const s of sessions.slice(0, 5)) {
    console.log(`  - ${s.name || s.id}`);
    console.log(`    路径: ${s.path}`);
    console.log(`    消息数: ${s.messageCount}`);
    console.log();
  }

  // ========== 6. 实际使用: 打开指定会话并对话 ==========
  console.log('--- 实际使用: 打开指定会话 ---');
  if (fs.existsSync(sessionFile)) {
    const { session } = await createAgentSession({
      model,
      authStorage,
      tools: [readTool, writeTool, bashTool, lsTool],
      sessionManager: SessionManager.open(sessionFile),
    });

    let fullResponse = '';
    session.subscribe((event) => {
      switch (event.type) {
        case 'turn_start':
          console.log('[对话开始]');
          break;
        case 'message_update':
          if ('assistantMessageEvent' in event && event.assistantMessageEvent?.type === 'text_delta') {
            process.stdout.write(event.assistantMessageEvent.delta);
            fullResponse += event.assistantMessageEvent.delta;
          }
          break;
        case 'turn_end':
          console.log('\n[对话结束]\n');
          break;
      }
    });

    console.log('请告诉我还记得之前对话的内容吗？');
    await session.prompt('请告诉我还记得之前对话的内容吗？');
    console.log('\n回复:', fullResponse);

    // 获取会话信息
    const sessionInfo = session.sessionManager.getHeader();
    if (sessionInfo) {
      console.log('\n会话信息:');
      console.log('  - 会话 ID:', sessionInfo.id);
      console.log('  - 工作目录:', sessionInfo.cwd);
    }
  }

  console.log('\n[Demo 完成]');
}

main().catch(console.error);
