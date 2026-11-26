import axios from 'axios';
import {
  MARKET_MODULES,
  TICKER_DEFINITIONS,
  resolveModuleKey
} from './market.constants.js';

const YAHOO_HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com'
];

const CMC_PUBLIC_V3_URL = 'https://pro-api.coinmarketcap.com/public-api/v3';
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const marketCache = new Map();

const getCached = (key, refresh) => {
  if (refresh === 'true' || refresh === true) return null;
  const entry = marketCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    marketCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (key, value) => {
  marketCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

/**
 * Fetch single symbol chart metadata from Yahoo Finance v8 API
 */
const fetchYahooChartQuote = async (yahooSymbol) => {
  let lastError = null;

  for (const host of YAHOO_HOSTS) {
    try {
      const url = `${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`;
      const response = await axios.get(url, {
        params: { interval: '1d', range: '1d' },
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          'Accept': 'application/json'
        },
        timeout: 8000
      });

      const result = response.data?.chart?.result?.[0];
      if (!result || !result.meta) continue;

      const meta = result.meta;
      const quoteIndicator = result.indicators?.quote?.[0] || {};
      const lastIdx = Array.isArray(quoteIndicator.close) && quoteIndicator.close.length > 0
        ? quoteIndicator.close.length - 1
        : 0;

      const price = meta.regularMarketPrice ?? quoteIndicator.close?.[lastIdx] ?? null;
      if (price === null || price === undefined) continue;

      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
      const change = prevClose != null ? Number((price - prevClose).toFixed(4)) : 0;
      const percentChange =
        prevClose && prevClose !== 0
          ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
          : 0;

      const open = meta.regularMarketOpen ?? quoteIndicator.open?.[lastIdx] ?? null;
      const high = meta.regularMarketDayHigh ?? quoteIndicator.high?.[lastIdx] ?? null;
      const low = meta.regularMarketDayLow ?? quoteIndicator.low?.[lastIdx] ?? null;
      const volume = meta.regularMarketVolume ?? quoteIndicator.volume?.[lastIdx] ?? null;

      const updatedAt = meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString();

      return {
        yahoo_symbol: meta.symbol || yahooSymbol,
        name: meta.longName || meta.shortName || null,
        price: Number(price),
        previous_close: prevClose != null ? Number(prevClose) : null,
        change,
        percent_change: percentChange,
        open: open != null ? Number(open) : null,
        high: high != null ? Number(high) : null,
        low: low != null ? Number(low) : null,
        volume: volume != null ? Number(volume) : null,
        currency: meta.currency || null,
        exchange: meta.exchangeName || null,
        updated_at: updatedAt,
        source: 'yahoo_finance'
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to fetch Yahoo Finance quote for ${yahooSymbol}`);
};

/**
 * Fallback helper via CNBC public quote service for bond yields not indexed on Yahoo Finance (e.g., Indonesia 10Y Bond Yield ID10Y)
 */
const fetchCnbcYieldFallback = async (cnbcSymbol) => {
  const response = await axios.get(
    'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol',
    {
      params: {
        symbols: cnbcSymbol,
        requestMethod: 'itv',
        noform: 1,
        partnerId: 2,
        fund: 1,
        exthrs: 1,
        output: 'json',
        events: 1
      },
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 8000
    }
  );

  const rawQuote = response.data?.FormattedQuoteResult?.FormattedQuote?.[0];
  if (!rawQuote || rawQuote.last === undefined) {
    throw new Error(`No quote returned for ${cnbcSymbol}`);
  }

  const parseNum = (val) => {
    if (val === undefined || val === null) return null;
    const cleaned = String(val).replace(/[,+%]/g, '').trim();
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  };

  const price = parseNum(rawQuote.last);
  const change = parseNum(rawQuote.change) ?? 0;
  const percentChange = parseNum(rawQuote.change_pct) ?? 0;

  return {
    yahoo_symbol: cnbcSymbol,
    name: rawQuote.name || rawQuote.shortName || null,
    price,
    previous_close: parseNum(rawQuote.previous_day_closing),
    change,
    percent_change: percentChange,
    open: parseNum(rawQuote.open),
    high: parseNum(rawQuote.high),
    low: parseNum(rawQuote.low),
    volume: parseNum(rawQuote.volume),
    currency: rawQuote.currency || null,
    exchange: rawQuote.exchange || null,
    updated_at: rawQuote.last_time || new Date().toISOString(),
    source: 'cnbc_quote'
  };
};

/**
 * Fetch quote for a single canonical ticker definition (with cache + fallback)
 */
const fetchSingleTickerPrice = async (tickerId, { refresh } = {}) => {
  const cacheKey = `ticker:${tickerId}`;
  const cached = getCached(cacheKey, refresh);
  if (cached) return cached;

  const def = TICKER_DEFINITIONS[tickerId];
  if (!def) {
    throw new Error(`Unknown ticker definition: ${tickerId}`);
  }

  let quoteData = null;

  // If bond yield prefers CNBC (e.g., GIDN10YR:GOV / ID10Y which isn't directly on Yahoo chart), try Yahoo first unless preferCnbcForYield is set
  const symbolsToTry = [def.yahooSymbol, ...(def.fallbackYahooSymbols || [])].filter(Boolean);

  if (!def.preferCnbcForYield) {
    for (const sym of symbolsToTry) {
      try {
        quoteData = await fetchYahooChartQuote(sym);
        if (quoteData && quoteData.price !== null) break;
      } catch {
        // continue to fallback symbol
      }
    }
  }

  if (!quoteData && def.cnbcSymbol) {
    try {
      quoteData = await fetchCnbcYieldFallback(def.cnbcSymbol);
    } catch {
      // fallback to Yahoo backup symbols if preferCnbcForYield failed
    }
  }

  if (!quoteData) {
    for (const sym of symbolsToTry) {
      try {
        quoteData = await fetchYahooChartQuote(sym);
        if (quoteData && quoteData.price !== null) break;
      } catch {
        // ignore
      }
    }
  }

  const normalized = {
    ticker: def.ticker,
    yahoo_symbol: quoteData?.yahoo_symbol || def.yahooSymbol,
    name: quoteData?.name || def.name,
    price: quoteData?.price ?? null,
    previous_close: quoteData?.previous_close ?? null,
    change: quoteData?.change ?? null,
    percent_change: quoteData?.percent_change ?? null,
    open: quoteData?.open ?? null,
    high: quoteData?.high ?? null,
    low: quoteData?.low ?? null,
    volume: quoteData?.volume ?? null,
    currency: quoteData?.currency || def.currency,
    updated_at: quoteData?.updated_at || new Date().toISOString()
  };

  if (normalized.price !== null) {
    setCached(cacheKey, normalized);
  }
  return normalized;
};

/**
 * Fetch batch of canonical tickers in parallel
 */
export const fetchTickerPrices = async (tickerIds, { refresh } = {}) => {
  return Promise.all(tickerIds.map((id) => fetchSingleTickerPrice(id, { refresh })));
};

/**
 * Helper to call CoinMarketCap v3 endpoint (tries keyed BASE_URL first, then keyless /public-api/v3)
 */
const requestCmcV3 = async (path, params = {}) => {
  const baseUrl = (process.env.BASE_URL || 'https://pro-api.coinmarketcap.com/v3').replace(/\/+$/, '');
  const apiKey = process.env.API_KEY;

  if (apiKey) {
    try {
      const res = await axios.get(`${baseUrl}${path}`, {
        params,
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      if (res.data) return res.data;
    } catch {
      // Fallback to public-api/v3 below
    }
  }

  const res = await axios.get(`${CMC_PUBLIC_V3_URL}${path}`, {
    params,
    headers: { 'Accept': 'application/json' },
    timeout: 10000
  });
  return res.data;
};

/**
 * Fetch latest crypto market listings from CoinMarketCap v3
 */
export const fetchCmcListings = async ({
  start = 1,
  limit = 10,
  convert = 'USD',
  refresh
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const safeStart = Math.max(Number(start) || 1, 1);
  const safeConvert = String(convert || 'USD').toUpperCase();

  const cacheKey = `cmc:listings:${safeStart}:${safeLimit}:${safeConvert}`;
  const cached = getCached(cacheKey, refresh);
  if (cached) return cached;

  try {
    const payload = await requestCmcV3('/cryptocurrency/listings/latest', {
      start: safeStart,
      limit: safeLimit,
      convert: safeConvert
    });

    const rawList = Array.isArray(payload?.data)
      ? payload.data
      : payload?.data?.cryptoCurrencyList || [];

    const listings = rawList.map((coin) => {
      let quoteObj = {};
      if (Array.isArray(coin.quote)) {
        quoteObj =
          coin.quote.find((q) => q.symbol === safeConvert) || coin.quote[0] || {};
      } else if (Array.isArray(coin.quotes)) {
        quoteObj =
          coin.quotes.find((q) => q.name === safeConvert) || coin.quotes[0] || {};
      } else if (coin.quote && typeof coin.quote === 'object') {
        quoteObj = coin.quote[safeConvert] || {};
      }

      return {
        id: coin.id,
        cmc_rank: coin.cmc_rank ?? coin.cmcRank ?? null,
        name: coin.name,
        symbol: coin.symbol,
        slug: coin.slug,
        circulating_supply: coin.circulating_supply ?? coin.circulatingSupply ?? null,
        total_supply: coin.total_supply ?? coin.totalSupply ?? null,
        max_supply: coin.max_supply ?? coin.maxSupply ?? null,
        price: quoteObj.price ?? null,
        volume_24h: quoteObj.volume_24h ?? quoteObj.volume24h ?? null,
        volume_change_24h: quoteObj.volume_change_24h ?? null,
        percent_change_1h: quoteObj.percent_change_1h ?? quoteObj.percentChange1h ?? null,
        percent_change_24h: quoteObj.percent_change_24h ?? quoteObj.percentChange24h ?? null,
        percent_change_7d: quoteObj.percent_change_7d ?? quoteObj.percentChange7d ?? null,
        percent_change_30d: quoteObj.percent_change_30d ?? quoteObj.percentChange30d ?? null,
        market_cap: quoteObj.market_cap ?? quoteObj.marketCap ?? null,
        market_cap_dominance:
          quoteObj.market_cap_dominance ?? quoteObj.marketCapDominance ?? null,
        fully_diluted_market_cap:
          quoteObj.fully_diluted_market_cap ?? quoteObj.fullyDilutedMarketCap ?? null,
        convert: quoteObj.symbol || safeConvert,
        last_updated: quoteObj.last_updated || coin.last_updated || null
      };
    });

    setCached(cacheKey, listings);
    return listings;
  } catch (error) {
    const err = new Error(
      error.response?.data?.status?.error_message ||
        error.message ||
        'Failed to fetch CoinMarketCap listings'
    );
    err.statusCode = error.response?.status || 502;
    throw err;
  }
};

/**
 * Fetch Crypto Fear & Greed Index from CoinMarketCap v3
 */
export const fetchCmcFearAndGreed = async ({ refresh } = {}) => {
  const cacheKey = 'cmc:fear_and_greed';
  const cached = getCached(cacheKey, refresh);
  if (cached) return cached;

  try {
    const payload = await requestCmcV3('/fear-and-greed/latest');
    const data = payload?.data || {};

    const result = {
      value: data.value ?? null,
      value_classification: data.value_classification ?? null,
      update_time: data.update_time || data.timestamp || null
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    const err = new Error(
      error.response?.data?.status?.error_message ||
        error.message ||
        'Failed to fetch CoinMarketCap Fear and Greed Index'
    );
    err.statusCode = error.response?.status || 502;
    throw err;
  }
};

/**
 * List all available market modules that the user/frontend can choose from
 */
export const getAvailableModules = () => {
  return Object.values(MARKET_MODULES).map((mod) => ({
    key: mod.key,
    label: mod.label,
    tickers: mod.tickers.map((t) => ({
      ticker: t,
      yahoo_symbol: TICKER_DEFINITIONS[t]?.yahooSymbol,
      name: TICKER_DEFINITIONS[t]?.name,
      currency: TICKER_DEFINITIONS[t]?.currency
    })),
    include_crypto_market: mod.includeCryptoMarket
  }));
};

/**
 * Fetch market data for a specific module (e.g. 'index-commodity', 'us-stocks', 'indo-stocks', 'us-treasury', 'crypto')
 */
export const getMarketByModule = async (
  moduleInput,
  { start = 1, limit = 10, convert = 'USD', refresh } = {}
) => {
  const key = resolveModuleKey(moduleInput);
  if (!key) return null;

  const mod = MARKET_MODULES[key];

  if (!mod.includeCryptoMarket) {
    const prices = await fetchTickerPrices(mod.tickers, { refresh });
    return {
      module: mod.key,
      label: mod.label,
      prices
    };
  }

  // Crypto module includes both Yahoo Finance prices (XBTUSD:CUR, XETUSD:CUR) + CMC market data
  const [prices, listings, fearAndGreed] = await Promise.all([
    fetchTickerPrices(mod.tickers, { refresh }),
    fetchCmcListings({ start, limit, convert, refresh }),
    fetchCmcFearAndGreed({ refresh })
  ]);

  return {
    module: mod.key,
    label: mod.label,
    prices,
    market: {
      fear_and_greed: fearAndGreed,
      listings
    }
  };
};

/**
 * Fetch market data across all modules (or a filtered subset passed via ?module= or ?modules=)
 */
export const getMarketsOverview = async ({
  modulesQuery,
  start = 1,
  limit = 10,
  convert = 'USD',
  refresh
} = {}) => {
  let targetKeys = Object.keys(MARKET_MODULES);

  if (modulesQuery) {
    const rawItems = Array.isArray(modulesQuery)
      ? modulesQuery.flatMap((m) => String(m).split(','))
      : String(modulesQuery).split(',');

    const resolved = [];
    const invalid = [];

    for (const item of rawItems) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const key = resolveModuleKey(trimmed);
      if (!key) {
        invalid.push(trimmed);
      } else if (!resolved.includes(key)) {
        resolved.push(key);
      }
    }

    if (invalid.length > 0) {
      const err = new Error(
        `Invalid market module(s): ${invalid.join(', ')}. Available modules: ${Object.keys(MARKET_MODULES).join(', ')}`
      );
      err.statusCode = 400;
      throw err;
    }

    if (resolved.length > 0) {
      targetKeys = resolved;
    }
  }

  const allNeededTickers = [
    ...new Set(targetKeys.flatMap((k) => MARKET_MODULES[k].tickers))
  ];
  const needsCryptoMarket = targetKeys.some(
    (k) => MARKET_MODULES[k].includeCryptoMarket
  );

  const [allPrices, cmcListings, cmcFearAndGreed] = await Promise.all([
    fetchTickerPrices(allNeededTickers, { refresh }),
    needsCryptoMarket
      ? fetchCmcListings({ start, limit, convert, refresh })
      : Promise.resolve(null),
    needsCryptoMarket
      ? fetchCmcFearAndGreed({ refresh })
      : Promise.resolve(null)
  ]);

  const priceByTicker = new Map(allPrices.map((p) => [p.ticker, p]));

  return targetKeys.map((key) => {
    const mod = MARKET_MODULES[key];
    const modulePrices = mod.tickers.map((t) => priceByTicker.get(t));

    if (!mod.includeCryptoMarket) {
      return {
        module: mod.key,
        label: mod.label,
        prices: modulePrices
      };
    }

    return {
      module: mod.key,
      label: mod.label,
      prices: modulePrices,
      market: {
        fear_and_greed: cmcFearAndGreed,
        listings: cmcListings
      }
    };
  });
};
