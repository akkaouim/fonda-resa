import { Router } from 'express';
import { Role } from '../../shared/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as usersController from './users.controller.js';

const router = Router();

// All routes require admin
router.use(authenticate, authorize(Role.ADMIN));

router.get('/', asyncHandler(usersController.list));
router.get('/:id', asyncHandler(usersController.getById));
router.post('/', asyncHandler(usersController.create));
router.put('/:id', asyncHandler(usersController.update));
router.post('/:id/reset-password', asyncHandler(usersController.resetPassword));
router.patch('/:id/deactivate', asyncHandler(usersController.deactivate));

export { router as usersRoutes };
