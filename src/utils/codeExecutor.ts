import { getPrice } from '../utils/pyth';

interface CacheEntry {
  value: number;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

const getPriceWithCache = async (...args: Parameters<typeof getPrice>): Promise<number | undefined> => {
  const cacheKey = JSON.stringify(args);
  const now = Date.now();
  const cached = priceCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.value;
  }

  const price = await getPrice(...args);
  if (price !== undefined) {
    priceCache.set(cacheKey, { value: price, timestamp: now });
  }
  return price;
};

export interface LogMessage {
  text: string;
  line: number;
  inputLine?: number;
}

export const executeCode = async (
  codeToExecute: string,
): Promise<LogMessage[]> => {
  const originalConsoleLog = console.log;
  let tempLogMessages: LogMessage[] = [];
  
  return new Promise((resolve, reject) => {
    console.log = (...args) => {
      const text = args.join(' ');
      if (!text.startsWith('useCodeExecution called')) {
        let inputLine: number | undefined;
        const lineMatch = text.match(/__INPUT_LINE_(\d+)__/);
        if (lineMatch) {
          inputLine = parseInt(lineMatch[1], 10);
          args.shift();
        }
        tempLogMessages.push({ 
          text: args.join(' '), 
          line: tempLogMessages.length + 1, 
          inputLine 
        });
        originalConsoleLog(`Captured log: ${args.join(' ')}`);
      }
    };

    try {
      tempLogMessages = [];
      const asyncFunction = new Function('getPrice', `
        return async function() {
          ${codeToExecute}
        }
      `);
      
      asyncFunction(getPriceWithCache)()
        .then(() => {
          console.log = originalConsoleLog;
          resolve(tempLogMessages);
        })
        .catch((error: Error) => {
          console.log = originalConsoleLog;
          reject(error);
        });
    } catch (error) {
      console.log = originalConsoleLog;
      reject(error);
    }
  });
};
