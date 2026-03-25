#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: Branch 会话分支
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
  console.log('=== pi-coding-agent Demo (Branch 会话分支) ===\n');

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

  // ========== 4. Branch 演示 ==========
  
  // 创建分支会话文件
  const branchDir = path.join(cwd, '.pi-sessions', 'branch-demo');
  fs.mkdirSync(branchDir, { recursive: true });
  const branchSessionFile = path.join(branchDir, 'branch.jsonl');

  // 创建新会话
  console.log('--- 创建新会话 (主分支) ---');
  const sessionManager = SessionManager.open(branchSessionFile);
  console.log('会话 ID:', sessionManager.getSessionId());

  // 创建 Agent 会话并对话
  const { session } = await createAgentSession({
    model,
    authStorage,
    tools: [readTool, writeTool, bashTool, lsTool],
    sessionManager,
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

  // 对话 1: 告诉 agent 名字
  console.log('>>> 用户: 我叫张三');
  await session.prompt('我叫张三，请记住');
  console.log();

  // 获取当前所有消息（用于查看分支点）
  const entries = sessionManager.getEntries();
  console.log('当前消息数:', entries.length);
  console.log();

  // === Branch 1: 从第一个消息创建分支 ===
  console.log('--- 创建分支 1 (从第1条消息) ---');
  const branchFromId = entries[0]?.id;
  if (branchFromId) {
    sessionManager.branch(branchFromId);
    console.log('分支点:', branchFromId);
    console.log('当前叶子节点:', sessionManager.getLeafId());
  }
  console.log();

  // 在分支 1 上对话
  console.log('>>> 分支1 用户: 我叫李四');
  await session.prompt('我叫李四');
  console.log();

  // 获取分支后的消息
  const branch1Entries = sessionManager.getEntries();
  console.log('分支1消息数:', branch1Entries.length);
  console.log();

  // === Branch 2: 使用 branchWithSummary ===
  console.log('--- 创建分支 2 (带摘要) ---');
  sessionManager.branchWithSummary(
    sessionManager.getLeafId()!,  // 从当前叶子节点
    '用户讨论了名字问题'  // 摘要
  );
  console.log('分支点:', sessionManager.getLeafId());
  console.log();

  // 在分支 2 上对话
  console.log('>>> 分支2 用户: 我叫王五');
  await session.prompt('我叫王五');
  console.log();

  // 显示会话树结构
  console.log('--- 会话树结构 ---');
  const tree = sessionManager.getTree();
  printTree(tree);
  console.log();

  // 切换回主分支继续对话
  console.log('--- 切换回主分支 ---');
  sessionManager.branch(entries[entries.length - 1].id);
  console.log('切换到:', sessionManager.getLeafId());
  console.log();

  // 继续在主分支对话
  console.log('>>> 主分支 用户: 我的名字是？');
  await session.prompt('我的名字是？');
  console.log();

  console.log('\n[Demo 完成]');
  console.log('Branch 功能: 在同一会话内创建多个对话分支，类似 git branch');
}

function printTree(nodes: any[], depth = 0) {
  for (const node of nodes) {
    const indent = '  '.repeat(depth);
    const type = node.entry.type;
    let label = `${indent}[${type}]`;
    
    if (type === 'message') {
      const msg = node.entry.message;
      const content = msg.content?.[0]?.type === 'text' 
        ? msg.content[0].text?.substring(0, 30) + '...' 
        : '[非文本]';
      label += ` ${content}`;
    }
    
    console.log(label);
    
    if (node.children) {
      printTree(node.children, depth + 1);
    }
  }
}

main().catch(console.error);
