import express from 'express';
import * as infoController from './info.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', infoController.getAllInfos);
router.get('/new', infoController.getNewInfos);
router.get('/:id', infoController.getInfoDetail);
router.post('/', optionalAuth, infoController.createInfo);
router.put('/:id', optionalAuth, infoController.updateInfo);
router.delete('/:id', optionalAuth, infoController.deleteInfo);

export default router;