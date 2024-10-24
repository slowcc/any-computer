import axios from 'axios';
//@ts-ignore
import pythIdMap from './pyth-ids.csv'

interface PriceData {
  price: string;
  conf: string;
  expo: number;
  publish_time: number;
}

interface PriceFeed {
  id: string;
  price: PriceData;
  ema_price: PriceData;
}

interface ProcessedPrice {
  id: string;
  price: number;
  conf: number;
  publishTime: number;
  emaPrice: number;
  emaConf: number;
  emaPublishTime: number;
}

// Add a new interface for the cache entry
interface CacheEntry {
  price: number;
  timestamp: number;
}

// Create a cache object
const priceCache: { [id: string]: CacheEntry } = {};

// Set cache duration to 10 minutes (in milliseconds)
const CACHE_DURATION = 10 * 60 * 1000;

export const getLatestPriceFeeds = async (ids: string[]): Promise<ProcessedPrice[]> => {
  try {
    const response = await axios.get('https://hermes.pyth.network/api/latest_price_feeds', {
      params: {
        ids: ids,
      },
    });

    const data: PriceFeed[] = response.data;

    const processedData: ProcessedPrice[] = data.map(feed => ({
      id: feed.id,
      price: parseFloat(feed.price.price) * Math.pow(10, feed.price.expo),
      conf: parseFloat(feed.price.conf) * Math.pow(10, feed.price.expo),
      publishTime: feed.price.publish_time,
      emaPrice: parseFloat(feed.ema_price.price) * Math.pow(10, feed.ema_price.expo),
      emaConf: parseFloat(feed.ema_price.conf) * Math.pow(10, feed.ema_price.expo),
      emaPublishTime: feed.ema_price.publish_time,
    }));

    return processedData;
  } catch (error) {
    console.error('Error fetching price feeds:', error);
    throw error;
  }
};

export const getAllNames = () => {
  return pythIdMap.map((row: { name: string; id: string }) => row.name);
}

// Function to get ID by name
export const getIdByName = (name: string): string | undefined => {
  return pythIdMap.find((row: { name: string; id: string }) => row.name === name)?.id;
};

export const getPrice = async (name: string): Promise<number | undefined> => {
  const tryGetPrice = async (id: string): Promise<number | undefined> => {
    // Check if the price is in the cache and not expired
    const cachedEntry = priceCache[id];
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
      return cachedEntry.price;
    }

    try {
      const prices = await getLatestPriceFeeds([id]);
      if (prices.length > 0) {
        const price = prices[0].price;
        // Update the cache
        priceCache[id] = {
          price: price,
          timestamp: Date.now()
        };
        return price;
      }
    } catch (error) {
      console.error(`Error fetching price for ${id}:`, error);
    }
    return undefined;
  };

  // Replace CNY with CNH for FX pairs
  if (name.startsWith('FX.') && name.includes('CNY')) {
    name = name.replace('CNY', 'CNH');
  }

  let id = getIdByName(name);
  let inverseName: string | undefined;
  let inverseId: string | undefined;

  // If we can't find the ID and it's an FX pair, try the inverse
  if (!id && name.startsWith('FX.')) {
    const [, currencies] = name.split('.');
    const [currencyA, currencyB] = currencies.split('/');
    inverseName = `FX.${currencyB}/${currencyA}`;
    inverseId = getIdByName(inverseName);
  }

  if (!id && !inverseId) {
    console.error(`No ID found for ${name} or its inverse`);
    throw new Error(`No ID found for ${name} or its inverse`);
  }

  let price: number | undefined;

  if (id) {
    price = await tryGetPrice(id);
  }

  if (price === undefined && inverseId) {
    const inversePrice = await tryGetPrice(inverseId);
    if (inversePrice !== undefined) {
      price = 1 / inversePrice;
    }
  }

  if (price === undefined) {
    console.error(`No price data found for ${name}${inverseName ? ` or ${inverseName}` : ''}`);
  }

  return price;
};
