import * as marketService from './market.service.js';

export const getModules = async (req, res, next) => {
  try {
    const modules = marketService.getAvailableModules();
    res.status(200).json({
      success: true,
      data: modules
    });
  } catch (error) {
    next(error);
  }
};

export const getMarkets = async (req, res, next) => {
  try {
    const { module, modules, start, limit, convert, refresh } = req.query;
    const modulesQuery = modules || module;

    const data = await marketService.getMarketsOverview({
      modulesQuery,
      start,
      limit,
      convert,
      refresh
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getMarketModule = async (req, res, next) => {
  try {
    const { module } = req.params;
    const { start, limit, convert, refresh } = req.query;

    const data = await marketService.getMarketByModule(module, {
      start,
      limit,
      convert,
      refresh
    });

    if (!data) {
      return res.status(400).json({
        success: false,
        message: `Invalid market module '${module}'`,
        available_modules: marketService.getAvailableModules().map((m) => m.key)
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

export const getCryptoListings = async (req, res, next) => {
  try {
    const { start, limit, convert, refresh } = req.query;
    const data = await marketService.fetchCmcListings({
      start,
      limit,
      convert,
      refresh
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getCryptoFearAndGreed = async (req, res, next) => {
  try {
    const { refresh } = req.query;
    const data = await marketService.fetchCmcFearAndGreed({ refresh });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
