import express from 'express';
import * as newsController from './news.controller.js';

const router = express.Router();

// GET /news — Finance news feed (defaults: language=en, country=us, topic=finance)
router.get('/', newsController.getNews);

// GET /news/:uuid — Full article detail by UUID
router.get('/:uuid', newsController.getNewsDetail);

export default router;
