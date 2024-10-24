export interface Provider {
  name: string;
  model: string;
}

export interface PromptInfo {
  template: string;
  provider: Provider;
}

export interface CardData {
  id: string;
  input: string;
  prompt: string;
  provider: string;
  model: string;
  output: string;
  isStreaming: boolean;
}

export type ExperimentMode = 'lockInput' | 'lockPrompt' | 'bench';

export interface HistorySession {
  id: string;
  mode: ExperimentMode;
  lockedInput: string;
  lockedPrompt: string;
  evalPrompt: string;
  cards: CardData[];
  createdAt: number;
  title: string;
  currentBenchInput?: string;
}

export interface Result {
  response: string;
  input: string;
  prompt: string;
  provider: string;
  model: string;
  timestamp: string;
  score: number;
  color: string;
}

export type ImageContent = {
  type: 'image_url';
  image_url: { url: string };
};

export type TextContent = {
  type: 'text';
  text: string;
};

export type MessageContent = TextContent | ImageContent;

export interface Message {
  role: string;
  content: string | MessageContent[];
}