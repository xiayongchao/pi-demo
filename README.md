# Pi Coding Agent Demo

基于 [pi-mono](https://github.com/badlogic/pi-mono) 的 PI 框架学习示例。

## 简介

PI 是一个用于构建 AI Agent 的工具包，包含：
- **pi-ai** - 跨提供商 LLM 通信
- **pi-agent-core** - 带工具调用的 Agent 循环
- **pi-coding-agent** - 完整编程 Agent（内置工具、会话持久化、扩展系统）
- **pi-tui** - 终端 UI 库

## 环境要求

- Node.js 20+
- API Key（如千问 API）

## 快速开始

```bash
# 安装依赖
npm install

# 设置 API Key
export QWEN_API_KEY=your-api-key

# 运行 Demo
npx tsx demos/01-minimal.mts
```

## Demo 列表

| 序号 | Demo | 说明 |
|------|------|------|
| 01 | minimal | 最小示例 - pi-ai 基础调用 |
| 02 | agent-core | Agent Core - 工具调用循环 |
| 03 | coding-agent | Coding Agent - 完整编程助手 |
| 04 | persistent-session | 文件保存记忆 |
| 05 | session-management | 会话管理（list/create/open） |
| 06 | session-fork | Fork 跨项目复制会话 |
| 07 | session-branch | Branch 会话分支 |
| 08 | session-parent | Parent Session 父子会话 |
| 09 | session-inherit | 手动继承父会话消息 |
| 10 | custom-tool-factory | 自定义工具工厂 |
| 11 | extensions | Extensions 扩展系统 |
| 12 | compaction | Compaction 上下文压缩 |
| 13 | steering | Steering 引导（steer/followUp） |
| 14 | thinking-levels | Thinking Levels 扩展思考 |
| 15 | auth-model-registry | AuthStorage & ModelRegistry |

## 配置

默认使用千问模型，可在 Demo 中修改：

```typescript
const model = {
  id: 'qwen-plus',
  provider: 'qwen',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  // ...
};
```

## 相关文档

- [PI 官方文档](https://github.com/badlogic/pi-mono)
- [技术栈解析](https://www.53ai.com/news/Openclaw/2026022234105.html)
