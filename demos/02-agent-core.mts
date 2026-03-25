#!/usr/bin/env npx tsx
// ========================================
// pi-agent-core Demo: 基础智能体
// ========================================
// pi-agent-core 是 Pi 框架的核心智能体库
// 提供底层的 Agent 类，支持工具调用、状态管理、事件流等

import { Agent } from '@mariozechner/pi-agent-core';
import { Type } from '@mariozechner/pi-ai';

async function main() {
  console.log('=== pi-agent-core Demo ===\n');

  // ========== 1. SSL 证书修复 ==========
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // ========== 2. 检查环境变量 ==========
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.error('请设置 QWEN_API_KEY');
    process.exit(1);
  }

  console.log('API Key:', apiKey.substring(0, 10) + '...\n');

  // ========== 3. 定义模型 ==========
  const qwenModel = {
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
  };

  // ========== 4. 定义工具 ==========
  // 使用 Type.Object 定义工具参数 schema
  const calculatorTool = {
    name: 'calculator',
    description: '执行数学计算',
    parameters: Type.Object({
      expression: Type.String({ description: '数学表达式，如 2+2*3' }),
    }),
    execute: async (args: { expression: string }) => {
      console.log(`[工具] calculator: ${args.expression}`);
      try {
        const result = Function(`"use strict"; return (${args.expression})`)();
        return `计算结果: ${result}`;
      } catch (e) {
        return `计算错误: ${e}`;
      }
    },
  };

  const currentTimeTool = {
    name: 'get_time',
    description: '获取当前时间',
    parameters: Type.Object({}),
    execute: async () => {
      const now = new Date();
      return `当前时间: ${now.toLocaleString('zh-CN')}`;
    },
  };

  // ========== 5. 创建 Agent 实例 ==========
  const agent = new Agent({
    // 动态获取 API key
    getApiKey: () => apiKey,
  });

  // 设置模型
  agent.setModel(qwenModel as any);

  // 设置工具
  agent.setTools([calculatorTool as any, currentTimeTool as any]);

  // ========== 6. 订阅事件 ==========
  agent.subscribe((event) => {
    switch (event.type) {
      case 'agent_start':
        console.log('[Agent 启动]');
        break;

      case 'turn_start':
        console.log('[对话轮次开始]');
        break;

      case 'message_start':
        console.log('[消息开始]');
        break;

      case 'message_update':
        // 检查是否是文本增量
        if (event.assistantMessageEvent.type === 'text_delta') {
          process.stdout.write(event.assistantMessageEvent.delta);
        }
        break;

      case 'message_end':
        console.log('\n[消息结束]');
        break;

      case 'tool_execution_start':
        console.log(`\n[工具调用] 开始: ${event.toolName}`);
        break;

      case 'tool_execution_end':
        console.log(`[工具完成] ${event.toolName}: ${String(event.result).substring(0, 50)}...`);
        break;

      case 'turn_end':
        console.log('\n[对话轮次结束]');
        break;

      case 'agent_end':
        console.log('[Agent 结束]');
        break;
    }
  });

  // ========== 7. 发送提示 ==========
  console.log('--- 对话 1: 简单问答 ---\n');
  await agent.prompt('你好，请用一句话介绍自己');

  console.log('\n\n--- 对话 2: 使用工具 ---\n');
  await agent.prompt('请计算 (15 + 25) * 2 等于多少？');

  console.log('\n\n--- 对话 3: 当前时间 ---\n');
  await agent.prompt('现在几点了？');

  console.log('\n\n[Demo 完成]');
}

main();
