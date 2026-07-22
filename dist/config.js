import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
let _cfg = null;
let _dirty = true;
export function invalidateCache() {
    _dirty = true;
}
function getConfigDir() {
    return join(homedir(), ".config", "opencode");
}
export function tiersPath() {
    return join(getConfigDir(), "tiers.json");
}
export function loadConfig() {
    if (!_dirty && _cfg)
        return _cfg;
    const path = tiersPath();
    if (!existsSync(path)) {
        throw new Error(`tiers.json not found at ${path}`);
    }
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    _cfg = raw;
    _dirty = false;
    return _cfg;
}
export function getActiveTiers(cfg) {
    return cfg.presets[cfg.activePreset] ?? Object.values(cfg.presets)[0] ?? {};
}
export function getActiveMode(cfg) {
    if (!cfg.modes || !cfg.activeMode)
        return undefined;
    return cfg.modes[cfg.activeMode];
}
export function tierModel(cfg, tier) {
    const tiers = getActiveTiers(cfg);
    return tiers[tier]?.model;
}
