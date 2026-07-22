import { RouterConfig, Preset, getActiveTiers, getActiveMode } from "./config.js";

export function buildDelegationProtocol(cfg: RouterConfig): string {
  const tiers = getActiveTiers(cfg);
  const tierLine = Object.entries(tiers)
    .map(([name, t]) => {
      const short = t.model.split("/").pop() ?? t.model;
      const v = t.variant ? `/${t.variant}` : "";
      const c = t.costRatio != null ? `(${t.costRatio}x)` : "";
      return `@${name}=${short}${v}${c}`;
    })
    .join(" ");

  const mode = getActiveMode(cfg);
  const modeSuffix = cfg.activeMode ? ` mode:${cfg.activeMode}` : "";
  const effectiveRules = mode?.overrideRules?.length ? mode.overrideRules : cfg.rules;
  const rulesLine = effectiveRules.map((r, i) => `${i + 1}.${r}`).join(" ");

  return [
    `## Model Delegation Protocol — MANDATORY`,
    ``,
    `You are the orchestrator. Information-gathering is NOT orchestration — it IS execution. Execution belongs to subagents, not to you.`,
    ``,
    `Preset: ${cfg.activePreset}. Tiers: ${tierLine}.${modeSuffix}`,
    ``,
    `Read-only work → @fast, Implementation → @medium, Architecture/debug → @heavy.`,
    `Delegate with Task(subagent_type="fast"|"medium"|"heavy", prompt="...").`,
    ``,
    rulesLine,
  ].join("\n");
}

export function assembleSystemPrompt(cfg: RouterConfig): string {
  return buildDelegationProtocol(cfg);
}

export function buildTiersOutput(cfg: RouterConfig): string {
  const tiers = getActiveTiers(cfg);
  const lines = [
    `# Model Delegation Tiers`,
    `Active preset: **${cfg.activePreset}**\n`,
  ];
  for (const [name, tier] of Object.entries(tiers)) {
    lines.push(`## @${name} -> \`${tier.model}\``);
    lines.push(tier.description);
    lines.push(`Steps: ${tier.steps ?? "default"}`);
    if (tier.whenToUse) lines.push(`Use when: ${tier.whenToUse.join(", ")}`);
    lines.push("");
  }
  lines.push("## Delegation Rules");
  cfg.rules.forEach((r) => lines.push(`- ${r}`));
  lines.push(`\nDefault tier: @${cfg.defaultTier}`);
  return lines.join("\n");
}
