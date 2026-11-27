import express from 'express';
import * as signalController from './signal.controller.js';
import { authenticate, optionalAuth } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', signalController.getSignals);
router.get('/sender/:sender_id', signalController.getSignalbySender);
router.get('/my', authenticate, signalController.getMySignals);
router.get('/:id', signalController.getSignalDetail);
router.post('/', optionalAuth, signalController.createSignal);
router.put('/:id', optionalAuth, signalController.updateSignal);
router.delete('/:id', optionalAuth, signalController.deleteSignal);

export default router;