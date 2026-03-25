#!/usr/bin/env npx tsx
// ========================================
// pi-coding-agent Demo: AuthStorage & ModelRegistry
// ========================================

import { 
  createAgentSession, 
  AuthStorage, 
  SessionManager,
  readTool,
  writeTool, 
  bashTool, 
  lsTool,
  ModelRegistry,
} from '@mariozechner/pi-coding-agent';
import * as path from 'path';
import * as fs from 'fs';


async function main() {
  console.log('=== pi-coding-agent Demo (AuthStorage & ModelRegistry) ===\n');

  // ========== 1. SSL 修复 ==========
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // ========== 2. 检查 API Key ==========
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.error('请设置 QWEN_API_KEY');
    process.exit(1);
  }
  console.log('API Key:', apiKey.substring(0, 10) + '...\n');

  const cwd = process.cwd();

  // ========== 3. AuthStorage 演示 ==========
  console.log('--- AuthStorage 演示 ---');
  
  // 方法 1: 使用内存存储
  console.log('1. AuthStorage.inMemory() - 内存存储');
  const authMemory = AuthStorage.inMemory({ 
    qwen: { type: 'api_key', key: apiKey } 
  });
  console.log('   凭证:', authMemory.get('qwen')?.type);
  
  // 方法 2: 使用文件存储
  console.log('\n2. AuthStorage.create() - 文件存储');
  const authDir = path.join(cwd, '.pi-sessions', 'auth-demo');
  fs.mkdirSync(authDir, { recursive: true });
  const authPath = path.join(authDir, 'auth.json');
  
  const authFile = AuthStorage.create(authPath);
  
  // 设置运行时 API key（不持久化）
  authFile.setRuntimeApiKey('qwen', apiKey);
  console.log('   运行时密钥已设置');
  
  // 查看凭证
  const cred = authFile.get('qwen');
  console.log('   凭证类型:', cred?.type);
  console.log();

  // ========== 4. ModelRegistry 演示 ==========
  console.log('--- ModelRegistry 演示 ---');
  
  const modelsDir = path.join(authDir, 'models.json');
  
  // 创建 models.json 配置文件
  const modelsConfig = {
    providers: {
      ollama: {
        baseUrl: 'http://localhost:11434/v1',
        api: 'openai-completions',
        apiKey: 'ollama',
        models: [
          { id: 'llama3.1:8b' },
          { id: 'qwen2.5-coder:7b' }
        ]
      },
      'my-company-api': {
        baseUrl: 'https://llm.internal.company.com/v1',
        api: 'openai-completions',
        apiKey: 'COMPANY_LLM_KEY',
        authHeader: true,
        models: [
          { id: 'internal-model-v2' }
        ]
      }
    }
  };
  
  fs.writeFileSync(modelsDir, JSON.stringify(modelsConfig, null, 2));
  console.log('已创建 models.json 配置文件');
  
  // 创建 ModelRegistry
  const modelRegistry = new ModelRegistry(authFile, modelsDir);
  modelRegistry.refresh();
  console.log('ModelRegistry 已加载');
  
  // 查看可用模型
  const availableModels = modelRegistry.getAll();
  console.log('\n可用模型数量:', availableModels.length);
  console.log('前5个模型:');
  for (const m of availableModels.slice(0, 5)) {
    console.log(`  - ${m.provider}/${m.id}`);
  }
  
  // 查找特定模型 - 简化处理
  console.log('\n查找 qwen-plus 模型...');
  console.log('(使用手动配置的模型)');
  console.log();

  // ========== 5. 创建 Agent 会话 ==========
  console.log('--- 创建 Agent 会话 (使用 AuthStorage) ---');
  
  const sessionDir = path.join(cwd, '.pi-sessions', 'auth-model-demo');
  fs.mkdirSync(sessionDir, { recursive: true });
  const sessionFile = path.join(sessionDir, 'session.jsonl');

  // 使用手动配置的模型
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

  const { session } = await createAgentSession({
    model,
    authStorage: authMemory,
    tools: [readTool, writeTool, bashTool, lsTool],
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
      case 'turn_end':
        console.log('\n');
        break;
    }
  });

  console.log('>>> 用户: 你好');
  fullResponse = '';
  await session.prompt('你好');
  console.log();

  console.log('\n[Demo 完成]');
  console.log('AuthStorage 功能:');
  console.log('  - inMemory(): 内存凭证存储');
  console.log('  - create(path): 文件凭证存储');
  console.log('  - setRuntimeApiKey(): 运行时覆盖（不持久化）');
  console.log('  - 支持 API Key 和 OAuth');
  console.log('\nModelRegistry 功能:');
  console.log('  - 从 models.json 加载自定义模型');
  console.log('  - list(): 列出所有可用模型');
  console.log('  - find(): 查找特定模型');
  console.log('  - 支持自定义 provider 配置');
}

main().catch(console.error);
