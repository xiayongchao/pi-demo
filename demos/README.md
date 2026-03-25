# Pi 智能体框架学习 Demo

基于 [badlogic/pi-mono](https://github.com/badlogic/pi-mono) 的官方 Pi 框架。

## 安装

```bash
npm install @mariozechner/pi-coding-agent @mariozechner/pi-ai @mariozechner/pi-agent-core
```

## 项目结构

```
pi-demo/
├── .pi/agent/           # 项目配置（可选）
│   └── ...
├── demos/
│   ├── 01-minimal.mts    # pi-ai 基础调用 ✅
│   ├── 02-agent-core.mts # pi-agent-core ✅
│   └── 03-coding-agent.mts # pi-coding-agent ⚠️
└── package.json
```

## Demo 说明

### Demo 1: pi-ai 基础调用 ✅

使用 `complete` 函数直接调用 LLM，支持千问模型。

```bash
export QWEN_API_KEY=your-key
npx tsx demos/01-minimal.mts
```

### Demo 2: pi-agent-core ✅

使用核心 Agent 类，支持工具调用。

```bash
export QWEN_API_KEY=your-key
npx tsx demos/02-agent-core.mts
```

### Demo 3: pi-coding-agent ⚠️

完整的编码智能体，有内置工具，但当前版本有连接问题。

```bash
export QWEN_API_KEY=your-key
npx tsx demos/03-coding-agent.mts
```

## 核心 API

### 1. 直接调用 LLM (pi-ai)

```typescript
import { complete } from '@mariozechner/pi-ai';

// 定义千问模型
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
};

// 调用
const result = await complete(model as any, {
  messages: [
    { role: 'user', content: 'Hello', timestamp: Date.now() }
  ]
}, { apiKey: 'your-key' });

// 读取回复
result.content.forEach((block: any) => {
  if (block.type === 'text') console.log(block.text);
});
```

### 2. 使用 Agent (pi-agent-core)

```typescript
import { Agent } from '@mariozechner/pi-agent-core';
import { Type } from '@mariozechner/pi-ai';

const agent = new Agent({ getApiKey: () => apiKey });
agent.setModel(model as any);

// 定义工具
agent.setTools([{
  name: 'calculator',
  description: '计算',
  parameters: Type.Object({
    expression: Type.String({})
  }),
  execute: async (args) => eval(args.expression)
}] as any);

// 订阅事件
agent.subscribe((event) => {
  if (event.type === 'message_update' && 
      event.assistantMessageEvent.type === 'text_delta') {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

// 发送提示
await agent.prompt('计算 2+2');
```

## 千问 API 配置

```typescript
const model = {
  id: 'qwen-plus',  // 或 qwen-turbo, qwen-max
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  api: 'openai-completions',
};
```

## 常见问题

### SSL 证书错误

```typescript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

### pi-coding-agent 连接问题

如果 `pi-coding-agent` 无法正常工作，请使用：
- `pi-ai` 直接调用 LLM
- `pi-agent-core` 创建智能体

## 更多信息

- [官方文档](https://pi.dev)
- [GitHub](https://github.com/badlogic/pi-mono)
