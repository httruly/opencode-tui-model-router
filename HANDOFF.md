# opencode-tui-model-router 交接文档

> 生成时间：2026-07-22
> 项目状态：已发布到 npm（1.0.0），GitHub 已推送，TUI 已验证可用

## 一、项目概览

这是一个 [OpenCode TUI](https://opencode.ai) 插件，基于 CLI 版 [opencode-model-router](https://github.com/marco-jardim/opencode-model-router)（作者 marco-jardim）改写，适配 TUI 插件系统。

核心思路：把编码任务按复杂度分三层，自动委派给不同价格的模型：

| 层级 | 角色 | 示例模型 |
|------|------|----------|
| `@fast` | 只读探索、搜索、grep | 本地 MiniCPM5 / 廉价云端 |
| `@medium` | 实现、编辑、测试 | DeepSeek V4 Flash Free |
| `@heavy` | 架构、调试、安全审查 | Step Router V1 |

## 二、目录结构

```
E:\my2\opencode-tui-model-router\
├── src/
│   ├── index.ts      — 插件入口：注册 agent、注入系统提示、跟踪会话
│   ├── config.ts     — tiers.json 加载 + 缓存 + 类型接口
│   ├── protocol.ts   — 构建委派协议文本 + /tiers 输出
│   └── sessions.ts   — 会话存储：区分子代理 / 编排器
├── dist/             — TypeScript 编译输出（已提交到 git）
├── package.json      — npm 包描述
├── tsconfig.json     — TS 编译配置
├── .gitignore
├── README.md         — 英文文档
└── README.zh.md      — 中文文档
```

GitHub：https://github.com/httruly/opencode-tui-model-router
npm：`opencode-tui-model-router@1.0.0`

## 三、核心文件说明

### 3.1 src/index.ts

插件入口，导出 `ModelRouterPlugin` 异步函数。返回三个钩子：

- **`config`** — 注册 `@fast` / `@medium` / `@heavy` 三个 agent 到 OpenCode，同时注册 `/tiers` 命令
- **`experimental.chat.system.transform`** — 向编排器系统提示注入委派协议；对子代理会话只注入 `[You are @fast (model)]` 前缀，避免递归
- **`chat.message`** — 每次消息后刷新 `tiers.json` 缓存，并注册当前会话是子代理还是编排器

### 3.2 src/config.ts

定义 `TierDef`、`Preset`、`RouterConfig` 等 TypeScript 接口。

关键函数：
- `loadConfig()` — 读取 `~/.config/opencode/tiers.json`，带内存缓存（`_cfg` + `_dirty`）
- `getActiveTiers(cfg)` — 返回当前 `activePreset` 对应的层级字典
- `getActiveMode(cfg)` — 返回当前 `activeMode` 对应的模式定义
- `tierPath()` — 返回 `~/.config/opencode/tiers.json` 路径

### 3.3 src/protocol.ts

- `buildDelegationProtocol(cfg)` — 生成委派协议文本，注入编排器系统提示
- `assembleSystemPrompt(cfg)` — 同上，别名
- `buildTiersOutput(cfg)` — 生成 `/tiers` 命令的 Markdown 输出

### 3.4 src/sessions.ts

- `createSessionStore()` — 基于 `Map<string, SessionInfo>` 的会话存储
- `registerFromChatMessage(input, output, cfg)` — 从聊天消息推断当前会话是不是子代理（通过 `input.agent` 是否匹配 preset 里的 tier 名）

## 四、依赖关系

运行时零外部依赖（只用 Node.js 内置模块 `fs`、`os`、`path`）。

开发依赖：
- `typescript ^5.9.3`
- `@opencode-ai/plugin ^1.18.4` — OpenCode 插件类型定义

插件本身不 import `@opencode-ai/plugin`，只在开发时用它的类型。

## 五、用户配置文件

### 5.1 tiers.json

路径：`~/.config/opencode/tiers.json`

必须字段：
```json
{
  "activePreset": "local-hybrid",
  "defaultTier": "medium",
  "rules": ["min(cost, adequate-tier)", "..."],
  "presets": {
    "local-hybrid": {
      "fast": {
        "model": "minicpm5/minicpm5",
        "description": "...",
        "steps": 30,
        "costRatio": 0
      },
      "medium": { "model": "deepseek-v4-flash-free", "steps": 20, "costRatio": 1 },
      "heavy":  { "model": "step-router-v1",        "steps": 15, "costRatio": 5 }
    }
  }
}
```

可选字段：`tierPrompts`、`modes`、`activeMode`、`variant`、`color`、`thinking`、`reasoning`

已废弃/未实现字段：`tierCaps`、`fallback`、`taskPatterns`、`enforcement`、`experimental`

### 5.2 opencode.jsonc

路径：`C:\Users\Administrator\.config\opencode\opencode.jsonc`

插件注册示例：
```jsonc
{
  "plugin": [
    "opencode-supermemory",
    "@zenobius/opencode-skillful",
    "opencode-tui-model-router"
  ]
}
```

注意：OpenCode TUI 的插件解析走 `~/.cache/opencode/packages/` 缓存目录，不是全局 `node_modules`。

## 六、安装与发布流程

### 6.1 本地开发

```bash
cd E:\my2\opencode-tui-model-router
npm install
npx tsc
```

产物在 `dist/`，已提交到 git。

### 6.2 发布到 npm

```bash
npm login
npm publish
```

当前已发布版本：`opencode-tui-model-router@1.0.0`

### 6.3 用户安装（README 写法）

```bash
npm install -g opencode-tui-model-router
```

然后在 `opencode.jsonc` 加 `"opencode-tui-model-router"`，重启 TUI。

### 6.4 实际验证情况

- **包名方式**：理论可行，但 TUI 需要先从 npm 缓存到 `~/.cache/opencode/packages/opencode-tui-model-router@latest/`
- **绝对路径方式**：已验证可行，指向 `~/.cache/opencode/packages/opencode-tui-model-router@latest/dist/index.js`
- **Git clone 源目录路径**：不可行

## 七、已知问题与限制

1. **不会自动委派**：orchestrator 对 trivial 任务（1-2 次工具调用）会自己直接回答，不会 dispatch 给子代理。用户需要用明确委派句式（"委派 @fast ..."）才能触发。
2. **tierCaps 未实现**：接口里有 `tierCaps` 字段，但代码没读取它。cap 逻辑在 `tierPrompts` 的提示词里硬编码。
3. **多个 preset 热切换未实现**：`activePreset` 改完后需要重启 TUI 才生效（因为 `loadConfig` 有内存缓存，但 TUI 不会自动刷新）。
4. **TUI 插件缓存机制**：TUI 把 npm 包装到 `~/.cache/opencode/packages/<pkg>@latest/`，如果 npm 安装失败或缓存损坏，插件不会加载，且没有明显报错。
5. **中文编码**：bat 脚本的中文在非 UTF-8 控制台下可能乱码，启动脚本已改成英文界面。

## 八、后续可优化方向

1. **实现 tierCaps**：把 `tierCaps` 读出来，动态注入到 tier prompt 的 CAP 行，而不是硬编码。
2. **auto-reload tiers.json**：监听 `tiers.json` 文件变化，自动刷新 `_cfg` 缓存，支持热切换 preset。
3. **更强的委派触发**：研究 OpenCode TUI 是否有事件可以让插件主动 dispatch，而不是靠 LLM 自己判断。
4. **发布前检查清单**：
   - 确认 `dist/` 是最新的 `npx tsc` 输出
   - 确认 `package.json` 版本号已 bump
   - `npm publish`
   - 更新 GitHub README 里的安装命令（如果用包名方式）
   - 在 `~/.config/opencode/opencode.jsonc` 里确认插件路径指向最新版

## 九、快速诊断

如果 `/tiers` 不出来或 agent 不显示：

1. 检查 `~/.config/opencode/opencode.jsonc` 的 `plugin` 数组里有 `"opencode-tui-model-router"`
2. 检查 `~/.cache/opencode/packages/opencode-tui-model-router@latest/dist/index.js` 是否存在
3. 如果不存在，手动复制过去，或 `npm install -g opencode-tui-model-router` 后重启 TUI
4. 检查 `~/.config/opencode/tiers.json` 是否存在且 JSON 格式正确
5. 重启 TUI（不是只刷新聊天窗口）

## 十、相关链接

- GitHub：https://github.com/httruly/opencode-tui-model-router
- npm：https://www.npmjs.com/package/opencode-tui-model-router
- 原版 CLI 插件：https://github.com/marco-jardim/opencode-model-router
- OpenCode 文档：https://opencode.ai/docs
- OpenCode 配置 precedence：https://opencode.ai/docs/config
