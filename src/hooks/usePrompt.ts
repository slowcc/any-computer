import { Provider, ProviderOptions } from "@slowcomputer/providers";
import { useRef, useState } from "react";
import { ChatCompletionBody } from "@slowcomputer/providers/dist/base";
import { Message as TypeMessage, MessageContent } from '../types';

const defaultProvider = "OpenAI";
const defaultModel = "gpt-4o-mini";

type ProviderModel = {
  provider: string;
  model?: string;
  apiKey?: string;
}

export type Message = {
  role: string;
  content?: string | MessageContent[];
  tool_call_id?: string;
  tool_calls?: any[];
}

type usePromptProps = {
  onStreamingStart?: (tag?: string) => void;
  onStreamingEnd: (content: string, response: Record<string, any>, tag?: string) => void;
  onStreamingAbort?: (tag?: string) => void;
  onError?: (error: any, tag?: string) => void;
}

type ResponseStatus = 'waiting' | 'requesting' | 'errored' | 'succeed' | 'aborted';

const customProviderOptions = {
  Anthropic: {
    kind: "anthropic",
    endpoint: `/anthropic`,
    defaultModels: [
      "claude-3-5-sonnet-20240620",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
      "claude-2.1",
      "claude-2.0",
      "claude-instant-1.2",
    ],
  },
  Hyperbolic: {
    kind: "openai",
    endpoint: "https://api.hyperbolic.xyz/v1"
  },
  GeminiProxy: {
    kind: "gemini",
    endpoint: "https://slow.computer/gemini",
  }
} as ProviderOptions;

export const prompt = async (messages: TypeMessage[], options: Partial<ChatCompletionBody> & { providers: ProviderModel[] }): Promise<string> => {
  const providers = options.providers || [
    {
      provider: defaultProvider,
      model: defaultModel,
    },
  ];

  const client = new Provider(providers, customProviderOptions);
  const { providers: _providers, ...rest } = options;

  return new Promise((resolve, reject) => {
    let result = '';
    client.createChatCompletionStream(
      {
        ...rest,
        messages,
      } as any,
      (response: Record<string, any>, end: boolean) => {
        result += response.content || '';
        if (end) {
          resolve(result);
        }
      },
      new AbortController()
    ).catch(reject);
  });
}

export const usePrompt = ({
  onStreamingStart,
  onStreamingEnd,
  onStreamingAbort,
  onError,
}: usePromptProps) => {

  const abortControllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatResponse, setChatResponse] = useState('');
  const streamedContentRef = useRef('');
  const streamedContentUsageRef = useRef(null);
  const [responseStatus, setResponseStatus] = useState<ResponseStatus>('waiting');
  const currentTagRef = useRef<string | undefined>(undefined);

  const initChatCompletionStream = async (
    messages: TypeMessage[],
    options: Partial<ChatCompletionBody> & { providers: ProviderModel[] },
    tag?: string
  ) => {
    setIsStreaming(true);
    setChatResponse('');
    streamedContentRef.current = '';
    abortControllerRef.current = new AbortController();
    setResponseStatus('requesting');
    currentTagRef.current = tag;

    onStreamingStart?.(tag);

    try {
      if (messages.length === 0) {
        throw new Error('No messages to send');
      }
      const providers = options?.providers || [
        {
          provider: defaultProvider,
          model: defaultModel,
        },
      ];

      const client = new Provider(providers, customProviderOptions);
      const { providers: _providers, ...rest } = options;
      await client.createChatCompletionStream(
        {
          ...rest,
          messages: messages,
        } as any,
        (response: Record<string, any>, end: boolean) => {
          streamedContentRef.current += response.content || '';
          if (response.usage) {
            streamedContentUsageRef.current = response.usage;
          }
          setChatResponse(streamedContentRef.current);
          if (end) {
            setIsStreaming(false);
            setResponseStatus('succeed');
            onStreamingEnd?.(streamedContentRef.current, {
              ...response,
              usage: streamedContentUsageRef.current,
            }, currentTagRef.current);
            streamedContentUsageRef.current = null
          }
        },
        abortControllerRef.current
      );
    } catch (error) {
      console.error('Error in chat request:', error);
      setIsStreaming(false);
      if ((error as any).message.includes('aborted')) {
        setResponseStatus('aborted');
        onStreamingAbort?.(currentTagRef.current);
      } else {
        setResponseStatus('errored');
        if (typeof (error as any).message == 'string')
          setChatResponse((error as any).message as string)
        onError?.(error, currentTagRef.current);
      }
    }
  }

  const cancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setResponseStatus('aborted');
      onStreamingAbort?.(currentTagRef.current);
    }
  };

  return {
    isStreaming,
    chatResponse,
    responseStatus,
    initChatCompletionStream,
    cancelStream,
  }
}
