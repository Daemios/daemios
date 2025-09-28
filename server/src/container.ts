import { prisma } from './db/prisma';
import { createInventoryApplicationService, PrismaInventoryRepository } from './modules/inventory';
import { createCharacterApplicationService, PrismaCharacterRepository } from './modules/character';
import { InventoryApplicationService } from './modules/inventory/application/inventory.service';
import { CharacterApplicationService } from './modules/character/application/character.service';
import { createInventoryRouter } from './modules/inventory/inventory.routes';
import { createCharacterRouter } from './modules/character/character.routes';
import { createEquipmentRouter } from './modules/equipment/equipment.routes';
import * as equipmentService from './modules/equipment/equipment.service';
import { EquipmentGateway } from './modules/inventory/application/inventory.service';

export interface AppContainer {
  services: {
    inventoryService: InventoryApplicationService;
    characterService: CharacterApplicationService;
  };
  routers: {
    inventoryRouter: ReturnType<typeof createInventoryRouter>;
    characterRouter: ReturnType<typeof createCharacterRouter>;
  };
}

function createEquipmentGateway(): EquipmentGateway {
  return {
    performEquipForCharacter: equipmentService.performEquipForCharacter,
    unequipItemToContainer: equipmentService.unequipItemToContainer,
  };
}

export function createAppContainer(): AppContainer {
  const inventoryRepository = new PrismaInventoryRepository(prisma);
  const characterRepository = new PrismaCharacterRepository(prisma);

  const characterService = createCharacterApplicationService({ repository: characterRepository });
  const inventoryService = createInventoryApplicationService({
    repository: inventoryRepository,
    equipmentGateway: createEquipmentGateway(),
  });

  const equipmentRouter = createEquipmentRouter({ characterService });
  const characterRouter = createCharacterRouter({ characterService });
  characterRouter.use('/', equipmentRouter);

  return {
    services: {
      inventoryService,
      characterService,
    },
    routers: {
      inventoryRouter: createInventoryRouter({ inventoryService, characterService }),
      characterRouter,
    },
  };
}

export const appContainer = createAppContainer();
