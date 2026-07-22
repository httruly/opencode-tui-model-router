# opencode-tui-model-router

An [OpenCode TUI](https://opencode.ai) plugin for automatic model-tier delegation (`@fast` / `@medium` / `@heavy`). Based on the [CLI plugin `opencode-model-router`](https://github.com/marco-jardim/opencode-model-router) by marco-jardim, rewritten for the OpenCode TUI plugin system.

## Why?

Running every coding task on a frontier model is slow and expensive. Most of your workflow is:

- **~40% exploration** — grep, read, search, look up docs (a cheap 1B model handles this fine)
- **~40% implementation** — edit, test, bugfix (mid-tier cloud model)
- **~20% architecture** — design decisions, security review, complex debugging (strong model needed)

This plugin teaches the orchestrator to dispatch each type of work to the right-priced tier automatically, with ~210 tokens of overhead. The result: faster iteration, lower cost, without sacrificing quality on the tasks that matter.

## How It Works

You define **tiers** in `~/.config/opencode/tiers.json`. Each tier maps a model to a role:

| Tier | Role | Example Model |
|------|------|---------------|
| `@fast` | Read-only exploration, search, grep | Local MiniCPM5 / cheap cloud |
| `@medium` | Implementation, editing, testing | DeepSeek V4 Flash Free |
| `@heavy` | Architecture, debugging, security review | Step Router V1 |

The plugin injects a **delegation protocol** into the orchestrator's system prompt that teaches it to:

1. **Classify every task** — exploration → `@fast`, implementation → `@medium`, architecture/debug → `@heavy`
2. **Delegate with `Task(subagent_type="fast"|"medium"|"heavy", prompt=...)`**
3. **Skip delegation** for trivial tasks (1-2 tool calls, handled directly)
4. **Never over-qualify** — always prefer the cheapest adequate tier

Subagent sessions are transparent — they receive only their role-specific instructions (stop conditions, caps, return protocol), not the full delegation prompt.

## Installation

### Option 1: npm (recommended)

The package is published on npm:

```bash
npm install -g opencode-tui-model-router
```

Then add it to your OpenCode TUI config (`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "plugins": [
    "opencode-tui-model-router"
  ],
  "disabled_providers": []
}
```

### Option 2: Local file

```bash
git clone https://github.com/your-username/opencode-tui-model-router.git
cd opencode-tui-model-router
npm install
npx tsc
```

Then add the local path to your config:

```jsonc
{
  "plugins": [
    "/absolute/path/to/opencode-tui-model-router/dist/index.js"
  ],
  "disabled_providers": []
}
```

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

Restart OpenCode TUI. `@fast`, `@medium`, `@heavy` agents will appear automatically.

## Usage

The orchestrator model (your main chat model) dispatches work automatically. You can also invoke a tier directly in chat:

- `@fast explore the project structure`
- `@medium implement this feature`
- `@heavy debug this issue`

### Commands

| Command | Description |
|---------|-------------|
| `/tiers` | Show active tier configuration, models, and rules |

### Tier Prompts

Each tier has a structured prompt that includes:
- **Stop conditions** — cap limits, redundancy detection, return protocol
- **Role definition** — what the tier should and should not do
- **Cap limits** — max read-only tool calls per dispatch (configurable via `tierCaps`)

## Configuration

### tiers.json

| Field | Description |
|-------|-------------|
| `activePreset` | Which preset to use (e.g. `"local-hybrid"`) |
| `activeMode` | Routing mode (optional, e.g. `"normal"`, `"budget"`, `"quality"`, `"deep"`) |
| `defaultTier` | Default tier when classification is ambiguous |
| `rules` | Delegation rules injected into the system prompt |
| `presets` | Named presets containing tier definitions |
| `tierCaps` | Maximum read-only tool calls per dispatch per tier |
| `tierPrompts` | Custom role prompts for each tier |
| `modes` | Routing mode definitions with override rules and default tiers |

### Multiple Presets

You can define multiple presets and switch between them by changing `activePreset`:

```json
{
  "activePreset": "local-hybrid",
  "presets": {
    "local-hybrid": { /* local + cloud mix */ },
    "all-cloud": { /* all cloud models */ },
    "budget": { /* cheapest models only */ }
  }
}
```

## Architecture

```
src/
  index.ts     — Plugin entry: registers agents, injects prompts, tracks sessions
  config.ts    — Loads & caches tiers.json with typed config interfaces
  protocol.ts  — Builds delegation system prompt and /tiers table output
  sessions.ts  — Session store that tracks subagent vs orchestrator sessions
```

Hooks:
- **`config`** — Registers `@fast`/`@medium`/`@heavy` agents with model, role prompt, and caps
- **`experimental.chat.system.transform`** — Injects delegation protocol into orchestrator prompts; skips for subagent sessions
- **`chat.message`** — Tracks sessions to distinguish orchestrator from subagent dispatches

## Differences from opencode-model-router (CLI)

| | opencode-model-router (CLI) | opencode-tui-model-router (this) |
|---|---|---|
| Platform | OpenCode CLI (`opencode.json`) | OpenCode TUI (`opencode.jsonc`) |
| Config | Built-in presets with `/preset` cmd | External `tiers.json` file |
| Agents | Injected via plugin hooks | OpenCode TUI `agent` config |
| Commands | `/tiers`, `/preset`, `/budget`, `/annotate-plan` | `/tiers` |
| Provider mgmt | Multi-provider with fallback | Relies on OpenCode provider config |
| Modes | `normal`, `budget`, `quality`, `deep` | Optional via `modes` in tiers.json |

## License

MIT
