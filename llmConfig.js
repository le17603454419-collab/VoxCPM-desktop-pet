const DEFAULT_LLM_CONFIG = {
  baseUrl: "https://open.bigmodel.cn/api/anthropic",
  model: "glm-5.2",
  timeoutMs: 300000,
  maxTokens: 512,
  temperature: 0.8,
  anthropicVersion: "2023-06-01",
  systemPrompt: "你是一个中文AI桌宠，语气可爱、简短、像陪伴型助手。回答不要太长。",
};

function getLlmConfig() {
  return {
    baseUrl: process.env.ANTHROPIC_BASE_URL || DEFAULT_LLM_CONFIG.baseUrl,
    authToken: process.env.ANTHROPIC_AUTH_TOKEN || process.env.AI_API_KEY,
    model: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || process.env.AI_MODEL || DEFAULT_LLM_CONFIG.model,
    timeoutMs: Number(process.env.API_TIMEOUT_MS || DEFAULT_LLM_CONFIG.timeoutMs),
    maxTokens: Number(process.env.AI_MAX_TOKENS || DEFAULT_LLM_CONFIG.maxTokens),
    temperature: Number(process.env.AI_TEMPERATURE || DEFAULT_LLM_CONFIG.temperature),
    anthropicVersion: process.env.ANTHROPIC_VERSION || DEFAULT_LLM_CONFIG.anthropicVersion,
    systemPrompt: process.env.AI_SYSTEM_PROMPT || DEFAULT_LLM_CONFIG.systemPrompt,
  };
}

module.exports = {
  DEFAULT_LLM_CONFIG,
  getLlmConfig,
};