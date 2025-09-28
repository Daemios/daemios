import { Router } from 'express';
import { createEquipmentController, EquipmentControllerDependencies } from './equipment.controller';

export type EquipmentRouterDependencies = EquipmentControllerDependencies;

export function createEquipmentRouter(deps: EquipmentRouterDependencies) {
  const router = Router();
  const controller = createEquipmentController(deps);

  router.post('/equip', controller.postEquip);
  router.post('/unequip', controller.postUnequip);
  router.get('/', controller.getList);

  return router;
}

export default createEquipmentRouter;
