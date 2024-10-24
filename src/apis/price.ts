// static data for pricing
// return as [inputTokenPricePerMillion, outputTokenPricePerMillion]
const pricingData = {
  openai: {
    'gpt-4o': [2.50, 10.00],
    'gpt-4o-mini': [0.15, 0.60],
  },
  anthropic: {
    'claude-3-5-sonnet': [3, 15],
    'claude-3-haiku': [0.25, 1.25],
  },
  gemini: {
    'gemini-1.5-flash': [0.075, 0.30],
    'gemini-1.5-pro': [3.50, 10.50],
  },
} as const;

export async function getPricePerMillionTokens(providerName: string, modelName: string): Promise<[number, number]> {
  const provider = providerName.replace('Provider', '').toLowerCase() as keyof typeof pricingData;

  if (!pricingData[provider]) {
    throw new Error(`Provider "${provider}" not found`);
  }
  const model = modelName.toLowerCase();
  // Try exact match first
  const exactPrice = pricingData[provider][model as keyof typeof pricingData[typeof provider]];
  if (exactPrice !== undefined) {
    return exactPrice; // Return the first price in the array
  }
  // If no exact match, try prefix matching
  // Sort model keys by length in descending order
  const sortedModelKeys = Object.keys(pricingData[provider]).sort((a, b) => b.length - a.length);
  const matchedModel = sortedModelKeys.find(key => model.startsWith(key));
  if (matchedModel) {
    return pricingData[provider][matchedModel as keyof typeof pricingData[typeof provider]];
  }

  throw new Error(`Model "${model}" not found for provider "${provider}"`);
}
