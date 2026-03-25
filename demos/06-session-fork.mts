#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: Fork 跨项目复制会话
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
  console.log('=== pi-coding-agent Demo (Fork 跨项目复制会话) ===\n');

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

  // ========== 4. Fork 演示 ==========
  
  // 源会话文件
  const sourceSessionFile = path.join(cwd, '.pi-sessions', 'assistant.jsonl');
  
  if (!fs.existsSync(sourceSessionFile)) {
    console.error('源会话文件不存在，请先运行 demo 4 创建会话');
    process.exit(1);
  }

  console.log('--- 源会话信息 ---');
  const sourceSession = SessionManager.open(sourceSessionFile);
  console.log('源会话 ID:', sourceSession.getSessionId());
  console.log('源会话文件:', sourceSession.getSessionFile());
  console.log();

  // 创建目标目录（模拟另一个项目）
  const targetDir = path.join(cwd, '.pi-sessions', 'fork-target');
  fs.mkdirSync(targetDir, { recursive: true });

  // 使用 forkFrom 复制会话到目标项目
  console.log('--- 执行 Fork ---');
  const forkedSession = SessionManager.forkFrom(
    sourceSessionFile,  // 源会话文件
    targetDir           // 目标工作目录
  );
  
  console.log('Fork 后的会话 ID:', forkedSession.getSessionId());
  console.log('Fork 后的会话文件:', forkedSession.getSessionFile());
  console.log('Fork 后的会话目录:', forkedSession.getSessionDir());
  console.log();

  // 验证 Fork 后的会话可以正常对话
  console.log('--- 使用 Fork 后的会话 ---');
  const { session } = await createAgentSession({
    model,
    authStorage,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager: forkedSession,
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

  console.log('测试: 问我还记得你的名字吗？');
  await session.prompt('我叫什么名字？');
  console.log('\n回复:', fullResponse);

  // 获取会话信息
  const sessionInfo = forkedSession.getHeader();
  if (sessionInfo) {
    console.log('\nFork 后会话信息:');
    console.log('  - 会话 ID:', sessionInfo.id);
    console.log('  - 工作目录:', sessionInfo.cwd);
  }

  console.log('\n[Demo 完成]');
  console.log('Fork 功能: 可以把一个项目的会话复制到另一个项目');
}

main().catch(console.error);
