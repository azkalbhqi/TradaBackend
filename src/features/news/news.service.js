import axios from 'axios';

const NEWS_BASE_URL = process.env.NEWS_BASE_URL || 'https://api.freenewsapi.io/v1';
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const newsCache = new Map();

const getCached = (key, refresh) => {
  if (refresh === 'true' || refresh === true) return null;
  const entry = newsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    newsCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (key, value) => {
  newsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

export const getFinanceNews = async ({
  language = 'en',
  country = 'us',
  topic = 'finance',
  cursor,
  offset,
  in_title,
  order_by,
  refresh
} = {}) => {
  const apiKey = process.env.API_KEY_NEWS;
  if (!apiKey) {
    const err = new Error('API_KEY_NEWS is not configured in environment variables');
    err.statusCode = 500;
    throw err;
  }

  const params = {
    language,
    country,
    topic
  };

  if (in_title) params.in_title = in_title;
  if (order_by) params.order_by = order_by;

  // FreeNewsApi does not allow cursor and offset simultaneously
  if (cursor) {
    params.cursor = cursor;
  } else if (offset !== undefined && offset !== '') {
    params.offset = offset;
  }

  const cacheKey = `news:${JSON.stringify(params)}`;
  const cached = getCached(cacheKey, refresh);
  if (cached) return cached;

  try {
    const response = await axios.get(`${NEWS_BASE_URL}/news`, {
      params,
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const result = {
      articles: response.data?.data || [],
      meta: response.data?.meta || {}
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    const upstreamMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to fetch news from FreeNewsApi';
    const err = new Error(upstreamMsg);
    err.statusCode = error.response?.status || 502;
    throw err;
  }
};

export const getNewsDetail = async (uuid, { refresh } = {}) => {
  const apiKey = process.env.API_KEY_NEWS;
  if (!apiKey) {
    const err = new Error('API_KEY_NEWS is not configured in environment variables');
    err.statusCode = 500;
    throw err;
  }

  const cacheKey = `news:detail:${uuid}`;
  const cached = getCached(cacheKey, refresh);
  if (cached) return cached;

  try {
    const response = await axios.get(`${NEWS_BASE_URL}/details`, {
      params: { uuid },
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    const detail = response.data?.data || null;
    if (detail) setCached(cacheKey, detail);
    return detail;
  } catch (error) {
    if (error.response?.status === 404) return null;
    const upstreamMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to fetch news details';
    const err = new Error(upstreamMsg);
    err.statusCode = error.response?.status || 502;
    throw err;
  }
};
