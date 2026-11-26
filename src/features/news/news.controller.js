import * as newsService from './news.service.js';

export const getNews = async (req, res, next) => {
  try {
    const {
      language = 'en',
      country = 'us',
      topic,
      category,
      cursor,
      offset,
      in_title,
      order_by,
      refresh
    } = req.query;

    const resolvedTopic = topic || category || 'finance';

    const result = await newsService.getFinanceNews({
      language,
      country,
      topic: resolvedTopic,
      cursor,
      offset,
      in_title,
      order_by,
      refresh
    });

    res.status(200).json({
      success: true,
      category: resolvedTopic,
      meta: result.meta,
      data: result.articles
    });
  } catch (error) {
    next(error);
  }
};

export const getNewsDetail = async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const data = await newsService.getNewsDetail(uuid, { refresh: req.query.refresh });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
