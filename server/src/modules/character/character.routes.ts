import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { createCharacterController, CharacterControllerDependencies } from './character.controller';

export type CharacterRouterDependencies = CharacterControllerDependencies;

export function createCharacterRouter(deps: CharacterRouterDependencies) {
  const router = Router();
  const controller = createCharacterController(deps);

  router.post('/logout', asyncHandler(controller.logout));
  router.get('/refresh', asyncHandler(controller.refresh));
  router.post('/character/select', asyncHandler(controller.selectCharacter));
  router.post('/character/create', asyncHandler(controller.createCharacter));
  router.get('/characters', asyncHandler(controller.listCharacters));

  return router;
}

export default createCharacterRouter;
