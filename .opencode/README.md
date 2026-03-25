# OpenCode 技能配置

本目录用于存放自定义技能文件。

## 目录结构

```
.opencode/
├── skills/          # 技能文件目录
│   └── example-skill.json   # 示例技能
└── README.md        # 本文档
```

## 技能文件格式

技能文件使用 JSON 格式，包含以下字段：

```json
{
  "name": "技能名称",
  "version": "1.0.0",
  "description": "技能描述",
  "triggers": ["触发词1", "触发词2"],
  "actions": [
    {
      "type": "command",
      "command": "要执行的命令"
    }
  ]
}
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 技能名称 |
| `version` | 是 | 版本号 |
| `description` | 否 | 技能详细描述 |
| `triggers` | 是 | 触发词数组 |
| `actions` | 是 | 要执行的动作 |

## actions 类型

### command
执行 bash 命令
```json
{
  "type": "command",
  "command": "ls -la"
}
```

### file
创建或修改文件
```json
{
  "type": "file",
  "action": "create|edit",
  "path": "/path/to/file",
  "content": "文件内容"
}
```

### ask
向用户提问
```json
{
  "type": "ask",
  "question": "你想要什么？",
  "options": ["选项1", "选项2"]
}
```
