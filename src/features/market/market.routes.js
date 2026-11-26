import express from 'express';
import * as marketController from './market.controller.js';

const router = express.Router();

// GET /market — Ambil semua modul market sekaligus (atau filter pakai ?module=us-stocks,crypto)
router.get('/', marketController.getMarkets);

// GET /market/modules — Daftar modul market beserta ticker yang bisa dipilih user
router.get('/modules', marketController.getModules);

// GET /market/crypto/listings — Data market CoinMarketCap listings terbaru
router.get('/crypto/listings', marketController.getCryptoListings);

// GET /market/crypto/fear-and-greed — Data CoinMarketCap Fear & Greed Index terbaru
router.get('/crypto/fear-and-greed', marketController.getCryptoFearAndGreed);

// GET /market/:module — Ambil data per modul: index-commodity | us-stocks | indo-stocks | us-treasury | crypto
router.get('/:module', marketController.getMarketModule);

export default router;
