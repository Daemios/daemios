import { Router } from 'express';
import { characterController } from './character.controller';
import { asyncHandler } from '../../utils/asyncHandler';

export const characterRouter = Router();

characterRouter.post('/logout', asyncHandler(characterController.logout));
characterRouter.get('/refresh', asyncHandler(characterController.refresh));
characterRouter.post('/character/select', asyncHandler(characterController.selectCharacter));
characterRouter.post('/character/create', asyncHandler(characterController.createCharacter));
characterRouter.get('/characters', asyncHandler(characterController.listCharacters));

export default characterRouter;
