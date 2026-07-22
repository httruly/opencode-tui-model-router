import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface TierDef {
  model: string;
  description: string;
  steps?: number;
  costRatio?: number;
  variant?: string;
  color?: string;
  thinking?: { budgetTokens?: number };
  reasoning?: { effort?: string; summary?: string };
  prompt?: string;
  whenToUse?: string[];
}

export interface Preset {
  [tierName: string]: TierDef;
}

export interface ModeDef {
  overrideRules?: string[];
}

export interface RouterConfig {
  activePreset: string;
  activeMode?: string;
  presets: Record<string, Preset>;
  rules: string[];
  defaultTier: string;
  tierPrompts?: Record<string, string>;
  modes?: Record<string, ModeDef>;
}

let _cfg: RouterConfig | null = null;
let _dirty = true;

export function invalidateCache() {
  _dirty = true;
}

function getConfigDir(): string {
  return join(homedir(), ".config", "opencode");
}

export function tiersPath(): string {
  return join(getConfigDir(), "tiers.json");
}

export function loadConfig(): RouterConfig {
  if (!_dirty && _cfg) return _cfg;
  const path = tiersPath();
  if (!existsSync(path)) {
    throw new Error(`tiers.json not found at ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  _cfg = raw as RouterConfig;
  _dirty = false;
  return _cfg;
}

export function getActiveTiers(cfg: RouterConfig): Preset {
  return cfg.presets[cfg.activePreset] ?? Object.values(cfg.presets)[0] ?? {};
}

export function getActiveMode(cfg: RouterConfig): ModeDef | undefined {
  if (!cfg.modes || !cfg.activeMode) return undefined;
  return cfg.modes[cfg.activeMode];
}

export function tierModel(cfg: RouterConfig, tier: string): string | undefined {
  const tiers = getActiveTiers(cfg);
  return tiers[tier]?.model;
}
