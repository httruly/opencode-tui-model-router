export const READ_ONLY_TOOLS = new Set(["grep", "glob", "read", "ls"]);

interface SessionInfo {
  tier?: string;
  agent?: string;
  isSubagent: boolean;
  isTrivial: boolean;
  toolCalls: number;
}

export function createSessionStore() {
  const sessions = new Map<string, SessionInfo>();

  return {
    register(sessionID: string, info: SessionInfo) {
      sessions.set(sessionID, info);
    },
    get(sessionID: string): SessionInfo | undefined {
      return sessions.get(sessionID);
    },
    isSubagent(sessionID: string): boolean {
      return sessions.get(sessionID)?.isSubagent ?? false;
    },
    isTrivial(sessionID: string): boolean {
      return sessions.get(sessionID)?.isTrivial ?? false;
    },
    unregister(sessionID: string) {
      sessions.delete(sessionID);
    },
    registerFromChatMessage(input: any, output: any, cfg: any) {
      const sid = input?.sessionID;
      if (!sid) return;
      const agent = input?.agent;
      const tierNames = Object.keys(cfg?.presets?.[cfg?.activePreset] ?? {});
      const isSubagent = agent ? tierNames.includes(agent) : false;
      sessions.set(sid, {
        agent,
        isSubagent,
        isTrivial: false,
        toolCalls: 0,
      });
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
