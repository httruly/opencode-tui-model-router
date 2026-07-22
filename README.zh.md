# opencode-tui-model-router

一款 [OpenCode TUI](https://opencode.ai) 插件，用于自动进行模型层级委派（`@fast` / `@medium` / `@heavy`）。基于 marco-jardim 的 [CLI 插件 `opencode-model-router`](https://github.com/marco-jardim/opencode-model-router) 改写，适配 OpenCode TUI 插件系统。

## 为什么要用这个插件？

把每一个编码任务都交给顶级模型处理，既慢又贵。实际工作中：

- **~40% 探索** — grep、读文件、搜索、查文档（廉价的 1B 本地模型足矣）
- **~40% 实现** — 编辑、测试、修 bug（中等价位云端模型）
- **~20% 架构** — 设计决策、安全审查、复杂调试（需要强模型）

这个插件教会编排器（orchestrator）自动把每种工作分派到合适价格的层级，仅 ~210 token 开销。结果是：迭代更快、成本更低，关键任务的质量不打折。

## 工作原理

在 `~/.config/opencode/tiers.json` 中定义层级。每个层级映射一个模型到一种角色：

| 层级 | 角色 | 示例模型 |
|------|------|----------|
| `@fast` | 只读探索、搜索、grep | 本地 MiniCPM5 / 廉价云端 |
| `@medium` | 实现、编辑、测试 | DeepSeek V4 Flash Free |
| `@heavy` | 架构、调试、安全审查 | Step Router V1 |

插件向编排器的系统提示中注入**委派协议**，教会它：

1. **分类每个任务** — 探索 → `@fast`，实现 → `@medium`，架构/调试 → `@heavy`
2. **用 `Task(subagent_type="fast"|"medium"|"heavy", prompt=...)` 委派**
3. **跳过委派** — 对简单任务（1-2 次工具调用）直接处理
4. **绝不超配** — 始终用最便宜的合适层级

子代理（subagent）会话是透明的——它们只收到角色特定的指令（停止条件、上限、返回协议），不包含完整的委派提示。

## 安装

```bash
npm install -g https://github.com/httruly/opencode-tui-model-router.git
```

然后添加到 OpenCode TUI 配置（`~/.config/opencode/opencode.jsonc`）：

```jsonc
{
  "plugins": [
    "opencode-tui-model-router"
  ],
  "disabled_providers": []
}
```

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

重启 OpenCode TUI，`@fast`、`@medium`、`@heavy` 代理会自动出现。

## 用法

编排器模型（主聊天模型）会自动分派工作。你也可以直接在聊天中调用指定层级：

- `@fast 探索项目结构`
- `@medium 实现这个功能`
- `@heavy 调试这个问题`

### 命令

| 命令 | 说明 |
|------|------|
| `/tiers` | 查看当前层级配置、模型和规则 |

### 层级提示

每个层级都有结构化的提示，包含：
- **停止条件** — 上限限制、冗余检测、返回协议
- **角色定义** — 该层级应做和不应做的事
- **上限** — 每次分派的最大只读工具调用次数（通过 `tierCaps` 配置）

## 配置说明

### tiers.json 字段

| 字段 | 说明 |
|------|------|
| `activePreset` | 使用的预设名称（如 `"local-hybrid"`） |
| `presets` | 包含层级定义的命名预设 |
| `rules` | 注入系统提示的委派规则 |
| `defaultTier` | 在 `/tiers` 中显示的默认层级 |
| `tierPrompts` | 自定义层级提示词 |
| `activeMode` | 可选——选择 `modes` 中的一个模式 |
| `modes` | 可选——模式定义，通过 `overrideRules` 替换 `rules` |

### 多预设

可以定义多个预设，修改 `activePreset` 切换：

```json
{
  "activePreset": "local-hybrid",
  "presets": {
    "local-hybrid": { /* 本地 + 云端混合 */ },
    "all-cloud": { /* 全云端 */ },
    "budget": { /* 仅最便宜模型 */ }
  }
}
```

## 插件架构

```
src/
  index.ts     — 插件入口：注册代理、注入提示、跟踪会话
  config.ts    — 加载和缓存 tiers.json，含类型配置接口
  protocol.ts  — 构建委派系统提示和 /tiers 表格输出
  sessions.ts  — 会话存储，区分子代理和编排器会话
```

钩子：
- **`config`** — 注册 `@fast`/`@medium`/`@heavy` 代理，配置模型、角色提示和上限
- **`experimental.chat.system.transform`** — 向编排器提示注入委派协议；跳过子代理会话
- **`chat.message`** — 跟踪会话以区分编排器和子代理调度

## 与 opencode-model-router (CLI) 的区别

| | opencode-model-router (CLI) | opencode-tui-model-router (本插件) |
|---|---|---|
| 平台 | OpenCode CLI (`opencode.json`) | OpenCode TUI (`opencode.jsonc`) |
| 配置 | 内置预设 + `/preset` 命令 | 外部 `tiers.json` 文件 |
| 代理 | 通过插件钩子注入 | OpenCode TUI `agent` 配置 |
| 命令 | `/tiers`、`/preset`、`/budget`、`/annotate-plan` | `/tiers` |
| 提供者管理 | 多提供者自动回退 | 依赖 OpenCode 提供者配置 |
| 模式 | `normal`、`budget`、`quality`、`deep` | 通过 `modes` 可选配置 |

## License

MIT
