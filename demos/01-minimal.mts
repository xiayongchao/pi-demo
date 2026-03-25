#!/usr/bin/env npx tsx
// ========================================
// Pi 框架 Demo: 使用 pi-ai 直接调用 LLM
// ========================================

import { complete } from '@mariozechner/pi-ai';

async function main() {
  console.log('=== Pi AI 直接调用 Demo ===\n');

  // ========== 1. SSL 证书问题修复 ==========
  // 如果遇到 SSL 证书错误，需要设置这个（仅用于开发环境）
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // ========== 2. 检查环境变量 ==========
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.error('错误: 请设置 QWEN_API_KEY 环境变量');
    console.error('运行: export QWEN_API_KEY=your-api-key');
    process.exit(1);
  }

  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1\n');

  // ========== 3. 定义模型 ==========
  // 定义千问模型，使用 OpenAI Completions API
  const qwenModel = {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    provider: 'qwen',
    api: 'openai-completions' as const,  // 使用 OpenAI 兼容 API
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',  // 千问 API 地址
    input: ['text'] as const,
    output: ['text'] as const,
    reasoning: false,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 131072,
    maxTokens: 8192,
  };

  // ========== 4. 发送请求 ==========
  console.log('发送提示: "Say hello in Chinese"\n');

  try {
    // complete(model, context, options) - 完整响应
    const result = await complete(
      qwenModel as any,
      {
        messages: [
          { role: 'user', content: 'Say hello in Chinese', timestamp: Date.now() }
        ]
      },
      { apiKey }  // 传入 API key
    );

    // ========== 5. 打印结果 ==========
    console.log('--- 结果 ---\n');
    
    // result.content 是一个数组，每个元素包含 text
    if (Array.isArray(result.content)) {
      result.content.forEach((block: any) => {
        if (block.type === 'text') {
          console.log('回复:', block.text);
        }
      });
    } else {
      console.log('回复:', result.content);
    }

    console.log('\n--- 完整结果 ---');
    console.log('角色:', result.role);
    console.log('停止原因:', result.stopReason);
    console.log('Token 使用:', result.usage?.totalTokens);
    console.log('\n[完成]');

  } catch (error: any) {
    console.error('\n错误:', error?.message || error?.errorMessage || error);
  }
}

// 运行主函数
main();
