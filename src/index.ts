import { loadConfig, getActiveTiers } from "./config.js";
import { assembleSystemPrompt } from "./protocol.js";
import { createSessionStore } from "./sessions.js";

const ModelRouterPlugin = async (ctx: any) => {
  let cfg = loadConfig();
  const activeTiers = getActiveTiers(cfg);
  const sessionStore = createSessionStore();

  return {
    config: async (opencodeConfig: any) => {
      opencodeConfig.agent ??= {};
      for (const [name, tier] of Object.entries(activeTiers)) {
        const agentDef: any = {
          model: tier.model,
          mode: "subagent",
          description: tier.description,
          maxSteps: tier.steps,
          color: tier.color,
        };
        if (tier.variant) agentDef.variant = tier.variant;
        const opts = buildAgentOptions(tier);
        if (Object.keys(opts).length > 0) agentDef.options = opts;
        const basePrompt = tier.prompt ?? cfg.tierPrompts?.[name] ?? "";
        agentDef.prompt = [
          `IMPORTANT: Start your response with exactly this line: [@${name}]`,
          basePrompt,
        ].filter(Boolean).join("\n\n");
        opencodeConfig.agent[name] = agentDef;
      }
      opencodeConfig.command ??= {};
      opencodeConfig.command["tiers"] = {
        template: "Output the current model delegation tiers configuration (active preset, each tier with model/description/steps, rules, and default tier). Format it cleanly. Do NOT use any tools — just output the information.",
        description: "Show model delegation tiers and rules",
      };
    },

    "experimental.chat.system.transform": async (_input: any, output: any) => {
      const sid = _input?.sessionID;
      if (sid && sessionStore.isSubagent(sid)) {
        const subAgent = sessionStore.get(sid)?.agent;
        if (subAgent) {
          const tiers = getActiveTiers(cfg);
          const modelShort = tiers[subAgent]?.model?.split("/")?.pop() ?? subAgent;
          output.system.unshift(`[You are @${subAgent} (${modelShort})]`);
        }
        return;
      }
      output.system.push(assembleSystemPrompt(cfg));
    },

    "chat.message": async (input: any, output: any) => {
      try { cfg = loadConfig(); } catch {}
      sessionStore.registerFromChatMessage(input, output, cfg);
    },
  };
};

function buildAgentOptions(tier: any): Record<string, any> {
  const opts: Record<string, any> = {};
  if (tier.thinking?.budgetTokens) opts.budget_tokens = tier.thinking.budgetTokens;
  if (tier.reasoning?.effort) opts.reasoning_effort = tier.reasoning.effort;
  if (tier.reasoning?.summary) opts.reasoning_summary = tier.reasoning.summary;
  return opts;
}

export default ModelRouterPlugin;
