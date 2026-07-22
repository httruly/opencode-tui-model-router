# opencode-tui-model-router

An [OpenCode](https://opencode.ai) plugin that routes tasks between **local** and **cloud** LLM models based on task complexity — `@fast` for cheap exploration, `@medium` for implementation, `@heavy` for architecture/debugging.

## How It Works

You define **tiers** in `~/.config/opencode/tiers.json`. Each tier maps a model to a role:

| Tier | Role | Example Model |
|------|------|---------------|
| `@fast` | Read-only exploration, search, grep | Local MiniCPM5 / cheap cloud |
| `@medium` | Implementation, editing, testing | DeepSeek V4 Flash Free |
| `@heavy` | Architecture, debugging, security review | Step Router V1 |

The plugin injects a **delegation protocol** into the system prompt, telling the orchestrator which tier to dispatch for each type of work. Subagent sessions are transparent — they receive only their role-specific instructions, not the full delegation prompt.

## Installation

### 1. Build the plugin

```bash
git clone https://github.com/your-username/opencode-tui-model-router.git
cd opencode-tui-model-router
npm install
npx tsc
```

### 2. Configure OpenCode

Add the plugin path to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": [
    "E:/path/to/opencode-tui-model-router/dist/index.js"
  ],
  // Ensure the needed providers are enabled
  "disabled_providers": []
}
```

### 3. Create tiers.json

Create `~/.config/opencode/tiers.json`:

```json
{
  "activePreset": "local-hybrid",
  "defaultTier": "medium",
  "rules": [
    "min(cost, adequate-tier)",
    "read-only work -> @fast, implementation -> @medium, arch/debug -> @heavy",
    "delegate with Task(subagent_type=\"fast\"|\"medium\"|\"heavy\", prompt=...)"
  ],
  "presets": {
    "local-hybrid": {
      "fast": {
        "model": "minicpm5/minicpm5",
        "description": "Local model for cheap exploration",
        "steps": 30,
        "costRatio": 0
      },
      "medium": {
        "model": "deepseek-v4-flash-free",
        "description": "Cloud model for implementation",
        "steps": 20,
        "costRatio": 1
      },
      "heavy": {
        "model": "step-router-v1",
        "description": "Strong cloud model for arch/debug",
        "steps": 15,
        "costRatio": 5
      }
    }
  }
}
```

## Usage

Once installed and configured, `@fast`, `@medium`, `@heavy` agents appear in OpenCode's agent list. The orchestrator model (your main chat model) will automatically delegate to the appropriate tier based on the task.

### `/tiers` Command

Type `/tiers` in chat to see the active delegation configuration:

```
# Model Delegation Tiers
Active preset: local-hybrid

## @fast -> minicpm5/minicpm5
Local model for cheap exploration
...

## Delegation Rules
- min(cost, adequate-tier)
...
```

## Plugin Architecture

```
src/
  index.ts     — Plugin entry: registers agents, injects prompts, tracks sessions
  config.ts    — Loads & caches tiers.json with typed config interfaces
  protocol.ts  — Builds delegation system prompt and /tiers table output
  sessions.ts  — Session store that tracks subagent vs orchestrator sessions
```

The plugin hooks into:
- **`config`** — Registers `@fast`/`@medium`/`@heavy` agents with model, role prompt, and caps
- **`experimental.chat.system.transform`** — Injects delegation protocol into orchestrator prompts; skips for subagent sessions
- **`chat.message`** — Tracks sessions to distinguish orchestrator from subagent dispatches

## License

MIT
