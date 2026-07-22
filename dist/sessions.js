export const READ_ONLY_TOOLS = new Set(["grep", "glob", "read", "ls"]);
export function createSessionStore() {
    const sessions = new Map();
    return {
        register(sessionID, info) {
            sessions.set(sessionID, info);
        },
        get(sessionID) {
            return sessions.get(sessionID);
        },
        isSubagent(sessionID) {
            return sessions.get(sessionID)?.isSubagent ?? false;
        },
        isTrivial(sessionID) {
            return sessions.get(sessionID)?.isTrivial ?? false;
        },
        unregister(sessionID) {
            sessions.delete(sessionID);
        },
        registerFromChatMessage(input, output, cfg) {
            const sid = input?.sessionID;
            if (!sid)
                return;
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
