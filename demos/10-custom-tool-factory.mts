#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: 自定义工具工厂
// ========================================

import { 
  createAgentSession, 
  AuthStorage, 
  SessionManager,
  createCodingTools,
  createReadTool,
  createBashTool,
  createGrepTool,
} from '@mariozechner/pi-coding-agent';
import * as path from 'path';
import * as fs from 'fs';


async function main() {
  console.log('=== pi-coding-agent Demo (自定义工具工厂) ===\n');

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

  // ========== 4. 自定义工具工厂演示 ==========
  
  // 演示 1: 创建作用于特定目录的工具
  console.log('--- 演示 1: 创建作用于特定目录的工具 ---');
  
  // 指定工具操作的工作目录
  const customWorkspace = path.join(cwd, 'demos');
  
  // 使用工厂函数创建自定义工具
  const customRead = createReadTool(customWorkspace);
  const customBash = createBashTool(customWorkspace);
  const customGrep = createGrepTool(customWorkspace);
  
  console.log('自定义工作目录:', customWorkspace);
  console.log('自定义 read 工具:', customRead.name);
  console.log('自定义 bash 工具:', customBash.name);
  console.log('自定义 grep 工具:', customGrep.name);
  console.log();

  // 演示 2: 使用 operations 注入自定义逻辑
  console.log('--- 演示 2: 使用 operations 注入自定义逻辑 ---');
  
  // 创建自定义的 BashOperations（简化版本）
  const { createLocalBashOperations } = await import('@mariozechner/pi-coding-agent');
  
  const sandboxedBash = createBashTool(cwd, {
    operations: {
      exec: async (command: string, cwd: string, opts: any) => {
        console.log('  [拦截] 准备执行命令:', command);
        // 使用本地执行
        const localOps = createLocalBashOperations();
        return localOps.exec(command, cwd, opts);
      },
    },
  });
  
  console.log('带拦截器的 bash 工具:', sandboxedBash.name);
  console.log('此工具会在执行前打印日志');
  console.log();

  // 演示 3: 创建完整的 coding 工具集
  console.log('--- 演示 3: 创建完整的 coding 工具集 ---');
  
  const demoDir = path.join(cwd, '.pi-sessions', 'tool-factory-demo');
  fs.mkdirSync(demoDir, { recursive: true });
  const sessionFile = path.join(demoDir, 'session.jsonl');
  
  const customCodingTools = createCodingTools(demoDir);
  console.log('自定义 coding 工具集:', customCodingTools.map(t => t.name).join(', '));
  console.log();

  // ========== 5. 创建 Agent 会话 ==========
  console.log('--- 创建 Agent 会话 ---');
  
  const { session } = await createAgentSession({
    model,
    authStorage,
    tools: [customRead, sandboxedBash],
    sessionManager: SessionManager.open(sessionFile),
  });

  let fullResponse = '';
  session.subscribe((event) => {
    switch (event.type) {
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
        console.log('[工具完成]', event.toolName, event.isError ? '(错误)' : '(成功)');
        break;
      case 'turn_end':
        console.log('\n');
        break;
    }
  });

  // 测试 1: 使用自定义目录的 read 工具
  console.log('>>> 测试 1: 读取 demos 目录');
  fullResponse = '';
  await session.prompt('请列出 demos 目录中的所有 .mts 文件');
  console.log();

  // 测试 2: 测试带拦截器的 bash
  console.log('>>> 测试 2: 执行 ls 命令（带拦截日志）');
  fullResponse = '';
  await session.prompt('请执行 ls 命令列出当前目录');
  console.log();

  console.log('\n[Demo 完成]');
  console.log('自定义工具工厂功能:');
  console.log('  - createReadTool(path): 读取特定目录的文件');
  console.log('  - createBashTool(path): 在特定目录执行命令');
  console.log('  - createGrepTool(path): 在特定目录搜索');
  console.log('  - operations: 注入自定义逻辑（如日志、监控）');
}

main().catch(console.error);
