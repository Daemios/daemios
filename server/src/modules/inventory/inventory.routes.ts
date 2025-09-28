import { Router } from 'express';
import { createInventoryController, InventoryControllerDependencies } from './inventory.controller';

export type InventoryRouterDependencies = InventoryControllerDependencies;

export function createInventoryRouter(deps: InventoryRouterDependencies) {
  const router = Router();
  const controller = createInventoryController(deps);

  router.get('/', controller.getInventory);
  router.post('/move', controller.postMove);
  router.post('/action', controller.postAction);

  return router;
}

export default createInventoryRouter;
