import { Router } from 'express';
import { userController } from './user.controller';
import { validate } from '../../middlewares/validate';
import { createUserRules, getUserRules } from './user.validators';
import { asyncHandler } from '../../utils/asyncHandler';

export const userRouter = Router();

// mount character endpoints under the same user router BEFORE the numeric id route
import { characterRouter } from '../character';
userRouter.use('/', characterRouter);

userRouter.post('/', validate(createUserRules), asyncHandler(userController.create));
userRouter.get('/:id', validate(getUserRules), asyncHandler(userController.getOne));
