export const providerOptions = [
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'Anthropic', label: 'Anthropic' },
  { value: 'Openrouter', label: 'Openrouter' },
  { value: 'Hyperbolic', label: 'Hyperbolic' },
  { value: 'DeepSeek', label: 'DeepSeek' },
  { value: 'Groq', label: 'Groq' },
  { value: 'Gemini', label: 'Gemini' },
  { value: 'Ollama', label: 'Ollama' },
];

export const modelOptions = {
  OpenAI: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
  Anthropic: [
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  Gemini: [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
};