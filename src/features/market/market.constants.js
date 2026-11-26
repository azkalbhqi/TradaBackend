// Definisi 14 instrumen market beserta mapping simbol Yahoo Finance (dan fallback CNBC untuk bond yield spesifik)
export const TICKER_DEFINITIONS = {
  // 1. Index and Commodity
  'SPX:IND': {
    ticker: 'SPX:IND',
    yahooSymbol: '^GSPC',
    fallbackYahooSymbols: ['ES=F'],
    cnbcSymbol: '.SPX',
    name: 'S&P 500 Index',
    currency: 'USD'
  },
  'GC1:COM': {
    ticker: 'GC1:COM',
    yahooSymbol: 'GC=F',
    fallbackYahooSymbols: ['XAUUSD=X'],
    cnbcSymbol: '@GC.1',
    name: 'Gold Futures',
    currency: 'USD'
  },
  'JCI:IND': {
    ticker: 'JCI:IND',
    yahooSymbol: '^JKSE',
    fallbackYahooSymbols: [],
    cnbcSymbol: '.JKSE',
    name: 'Jakarta Composite Index (IHSG)',
    currency: 'IDR'
  },

  // 2. US Stocks
  'AAPL:US': {
    ticker: 'AAPL:US',
    yahooSymbol: 'AAPL',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'AAPL',
    name: 'Apple Inc.',
    currency: 'USD'
  },
  'NVDA:US': {
    ticker: 'NVDA:US',
    yahooSymbol: 'NVDA',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'NVDA',
    name: 'NVIDIA Corporation',
    currency: 'USD'
  },
  'TSLA:US': {
    ticker: 'TSLA:US',
    yahooSymbol: 'TSLA',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'TSLA',
    name: 'Tesla, Inc.',
    currency: 'USD'
  },

  // 3. INDO Stocks
  'BBCA:IJ': {
    ticker: 'BBCA:IJ',
    yahooSymbol: 'BBCA.JK',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'BBCA-ID',
    name: 'Bank Central Asia Tbk',
    currency: 'IDR'
  },
  'BMRI:IJ': {
    ticker: 'BMRI:IJ',
    yahooSymbol: 'BMRI.JK',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'BMRI-ID',
    name: 'Bank Mandiri (Persero) Tbk',
    currency: 'IDR'
  },
  'TLKM:IJ': {
    ticker: 'TLKM:IJ',
    yahooSymbol: 'TLKM.JK',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'TLKM-ID',
    name: 'Telkom Indonesia (Persero) Tbk',
    currency: 'IDR'
  },

  // 4. US Treasury (& Sovereign Bonds)
  'USGG10YR:GOV': {
    ticker: 'USGG10YR:GOV',
    yahooSymbol: '^TNX',
    fallbackYahooSymbols: ['ZN=F'],
    cnbcSymbol: 'US10Y',
    name: 'US 10-Year Treasury Yield',
    currency: 'USD'
  },
  'USGG2YR:GOV': {
    ticker: 'USGG2YR:GOV',
    yahooSymbol: '2YY=F',
    fallbackYahooSymbols: ['ZT=F', '^IRX'],
    cnbcSymbol: 'US2Y',
    name: 'US 2-Year Treasury Yield',
    currency: 'USD'
  },
  'GIDN10YR:GOV': {
    ticker: 'GIDN10YR:GOV',
    yahooSymbol: 'ID10Y=X',
    fallbackYahooSymbols: ['^TYX'],
    cnbcSymbol: 'ID10Y',
    preferCnbcForYield: true,
    name: 'Indonesia 10-Year Government Bond Yield',
    currency: 'IDR'
  },

  // 5. Crypto
  'XBTUSD:CUR': {
    ticker: 'XBTUSD:CUR',
    yahooSymbol: 'BTC-USD',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'BTC.CM=',
    name: 'Bitcoin / USD',
    currency: 'USD'
  },
  'XETUSD:CUR': {
    ticker: 'XETUSD:CUR',
    yahooSymbol: 'ETH-USD',
    fallbackYahooSymbols: [],
    cnbcSymbol: 'ETH.CM=',
    name: 'Ethereum / USD',
    currency: 'USD'
  }
};

export const MARKET_MODULES = {
  'index-commodity': {
    key: 'index-commodity',
    label: 'Index and Commodity',
    tickers: ['SPX:IND', 'GC1:COM', 'JCI:IND'],
    includeCryptoMarket: false
  },
  'us-stocks': {
    key: 'us-stocks',
    label: 'US Stocks',
    tickers: ['AAPL:US', 'NVDA:US', 'TSLA:US'],
    includeCryptoMarket: false
  },
  'indo-stocks': {
    key: 'indo-stocks',
    label: 'INDO Stocks',
    tickers: ['BBCA:IJ', 'BMRI:IJ', 'TLKM:IJ'],
    includeCryptoMarket: false
  },
  'us-treasury': {
    key: 'us-treasury',
    label: 'US Treasury',
    tickers: ['USGG10YR:GOV', 'USGG2YR:GOV', 'GIDN10YR:GOV'],
    includeCryptoMarket: false
  },
  'crypto': {
    key: 'crypto',
    label: 'Crypto',
    tickers: ['XBTUSD:CUR', 'XETUSD:CUR'],
    includeCryptoMarket: true
  }
};

const MODULE_ALIASES = {
  'index-commodity': 'index-commodity',
  'index_commodity': 'index-commodity',
  'indexcommodity': 'index-commodity',
  'index-and-commodity': 'index-commodity',
  'index': 'index-commodity',
  'indices': 'index-commodity',
  'commodity': 'index-commodity',

  'us-stocks': 'us-stocks',
  'us_stocks': 'us-stocks',
  'usstocks': 'us-stocks',
  'us-stock': 'us-stocks',
  'us': 'us-stocks',

  'indo-stocks': 'indo-stocks',
  'indo_stocks': 'indo-stocks',
  'indostocks': 'indo-stocks',
  'indo-stock': 'indo-stocks',
  'indo': 'indo-stocks',
  'idx': 'indo-stocks',

  'us-treasury': 'us-treasury',
  'us_treasury': 'us-treasury',
  'ustreasury': 'us-treasury',
  'treasury': 'us-treasury',
  'bonds': 'us-treasury',
  'gov': 'us-treasury',

  'crypto': 'crypto',
  'cryptocurrency': 'crypto'
};

export const resolveModuleKey = (input) => {
  if (!input || typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  return MODULE_ALIASES[normalized] || null;
};
