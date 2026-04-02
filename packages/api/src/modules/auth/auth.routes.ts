import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.post('/forgot-password', asyncHandler(authController.forgotPassword));
router.post('/reset-password', asyncHandler(authController.resetPassword));
router.post('/change-password', authenticate, asyncHandler(authController.changePassword));
router.get('/me', authenticate, asyncHandler(authController.me));

export { router as authRoutes };
