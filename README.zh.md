# opencode-tui-model-router

一个 [OpenCode](https://opencode.ai) 插件，根据任务复杂度在**本地**和**云端** LLM 模型之间路由任务 — `@fast` 用于廉价探索，`@medium` 用于实现，`@heavy` 用于架构/调试。

## 工作原理

在 `~/.config/opencode/tiers.json` 中定义层级。每个层级将一个模型映射到一个角色：

| 层级 | 角色 | 示例模型 |
|------|------|----------|
| `@fast` | 只读探索、搜索、grep | 本地 MiniCPM5 / 廉价云端 |
| `@medium` | 实现、编辑、测试 | DeepSeek V4 Flash Free |
| `@heavy` | 架构、调试、安全审查 | Step Router V1 |

插件向系统提示中注入**委派协议**，告诉编排器（orchestrator）为每种工作分配合适的层级。子代理（subagent）会话是透明的——它们只收到角色特定的指令，不包含完整的委派提示。

## 安装

### 1. 构建插件

```bash
git clone https://github.com/your-username/opencode-tui-model-router.git
cd opencode-tui-model-router
npm install
npx tsc
```

### 2. 配置 OpenCode

将插件路径添加到 `~/.config/opencode/opencode.jsonc`：

```jsonc
{
  "plugins": [
    "E:/path/to/opencode-tui-model-router/dist/index.js"
  ],
  "disabled_providers": []
}
```

### 3. 创建 tiers.json

创建 `~/.config/opencode/tiers.json`：

```json
{
  "activePreset": "local-hybrid",
  "defaultTier": "medium",
  "rules": [
    "min(成本, 合适层级)",
    "只读工作 -> @fast, 实现 -> @medium, 架构/调试 -> @heavy",
    "用 Task(subagent_type=\"fast\"|\"medium\"|\"heavy\", prompt=...) 委派"
  ],
  "presets": {
    "local-hybrid": {
      "fast": {
        "model": "minicpm5/minicpm5",
        "description": "本地模型，用于廉价探索",
        "steps": 30,
        "costRatio": 0
      },
      "medium": {
        "model": "deepseek-v4-flash-free",
        "description": "云端模型，用于实现",
        "steps": 20,
        "costRatio": 1
      },
      "heavy": {
        "model": "step-router-v1",
        "description": "强云端模型，用于架构/调试",
        "steps": 15,
        "costRatio": 5
      }
    }
  }
}
```

## 用法

安装配置后，`@fast`、`@medium`、`@heavy` 代理会出现在 OpenCode 的代理列表中。编排器模型（你的主聊天模型）会根据任务自动委派到合适的层级。

### `/tiers` 命令

在聊天中输入 `/tiers` 查看当前委派配置：

```
# Model Delegation Tiers
Active preset: local-hybrid

## @fast -> minicpm5/minicpm5
本地模型，用于廉价探索
...

## Delegation Rules
- min(成本, 合适层级)
...
```

## 插件架构

```
src/
  index.ts     — 插件入口：注册代理、注入提示、跟踪会话
  config.ts    — 加载和缓存 tiers.json，含类型配置接口
  protocol.ts  — 构建委派系统提示和 /tiers 表格输出
  sessions.ts  — 会话存储，区分子代理和编排器会话
```

插件的钩子：
- **`config`** — 注册 `@fast`/`@medium`/`@heavy` 代理，配置模型、角色提示和上限
- **`experimental.chat.system.transform`** — 向编排器提示注入委派协议；跳过子代理会话
- **`chat.message`** — 跟踪会话以区分编排器和子代理调度

## License

MIT
