import { getPricePerMillionTokens } from '../apis/price';

interface Tag {
  key: string;
  value: string;
}

export interface Span {
  tags: Tag[];
  spanID: string;
  children?: Span[];
}

export const calculateSpanCost = async (span: Span): Promise<number> => {
  let spanCost = 0;
  const responseTag = span.tags.find(tag => tag.key === 'response');
  const providerTag = span.tags.find(tag => tag.key === 'provider');
  const modelTag = span.tags.find(tag => tag.key === 'model');

  if (responseTag && providerTag && modelTag) {
    try {
      const parsedResponse = JSON.parse(responseTag.value as string);
      const usage = parsedResponse.usage;

      if (usage && usage.prompt_tokens && usage.completion_tokens) {
        const [inputPrice, outputPrice] = await getPricePerMillionTokens(providerTag.value as string, modelTag.value as string);
        const inputCost = (usage.prompt_tokens / 1000000) * inputPrice;
        const outputCost = (usage.completion_tokens / 1000000) * outputPrice;
        spanCost = inputCost + outputCost;
      }
    } catch (error) {
      console.error('Failed to calculate cost for span:', error);
    }
  }

  return spanCost;
};

export const calculateTotalSpanCost = async (spans: Span[]): Promise<{ [spanId: string]: number }> => {
  const spanCosts: { [spanId: string]: number } = {};

  const calculateCosts = async (spans: Span[]) => {
    for (const span of spans) {
      const cost = await calculateSpanCost(span);
      spanCosts[span.spanID] = cost;

      if (span.children) {
        await calculateCosts(span.children);
        spanCosts[span.spanID] += span.children.reduce((sum, child) => sum + spanCosts[child.spanID], 0);
      }
    }
  };

  await calculateCosts(spans);
  return spanCosts;
};
