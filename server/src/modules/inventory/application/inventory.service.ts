import { DomainError, ensureValidTargetIndex, validateMovePayload } from '../inventory.domain';
import { InventoryRepository, ContainerWithItems } from './ports/inventory.repository';
import { mapItemForClient as baseMapItemForClient } from '../../common/presentation';

type CharacterLike = { id: number } & Record<string, unknown>;

type MoveItemDto = {
  itemId: number | string;
  source?: { containerId: number | null; localIndex: number | null } | null;
  target?: { containerId: number | null; localIndex: number | null } | null;
};

type PlaceItemDto = {
  itemId: number | string;
  destination?:
    | { type: 'equipment'; slotId: string }
    | { type: 'container'; containerId: number | string; index?: number; localIndex?: number };
};

export interface EquipmentGateway {
  performEquipForCharacter(characterId: number, itemId: number, slotId: string): Promise<any>;
  unequipItemToContainer(characterId: number, itemId: number, containerId: number, containerIndex: number): Promise<any>;
}

export class InventoryApplicationService {
  private static readonly TEMP_INDEX = -999999;

  constructor(
    private readonly repository: InventoryRepository,
    private readonly equipmentGateway: EquipmentGateway,
  ) {}

  mapItemForClient = baseMapItemForClient;

  async fetchContainersWithItems(characterId: number) {
    const containers = await this.repository.fetchContainersWithItems(characterId);
    return containers.map((c) => this.mapContainer(c));
  }

  listEquipmentForCharacter(characterId: number) {
    return this.repository.listEquipmentForCharacter(characterId);
  }

  async containerIsDescendantOfItem(containerId: number | null, ancestorItemId: number): Promise<boolean> {
    let currentId: number | null = containerId;
    while (currentId) {
      const container = await this.repository.findContainerById(currentId);
      if (!container || !container.itemId) return false;
      if (container.itemId === ancestorItemId) return true;
      const parentItem = await this.repository.findItemById(container.itemId);
      if (!parentItem) return false;
      currentId = parentItem.containerId ?? null;
    }
    return false;
  }

  async moveItemForCharacter(character: CharacterLike, payload: MoveItemDto | null | undefined) {
    let normalized: ReturnType<typeof validateMovePayload>;
    try {
      normalized = validateMovePayload(payload);
    } catch (err: any) {
      if (err instanceof DomainError) throw Object.assign(new Error(err.message), { status: 400 });
      throw err;
    }

    const { itemId, source, target } = normalized;

    const moving = await this.repository.findItemById(Number(itemId));
    if (!moving) throw Object.assign(new Error('Item not found'), { status: 404 });
    if (moving.characterId !== character.id)
      throw Object.assign(new Error('Item does not belong to the active character'), { status: 403 });

    const src = source || { containerId: moving.containerId ?? null, localIndex: moving.containerIndex ?? null };
    const tgt = target;

    if (tgt && tgt.containerId) {
      const targetContainer = await this.repository.findContainerById(tgt.containerId);
      if (!targetContainer) throw Object.assign(new Error('Target container not found'), { status: 400 });
      try {
        ensureValidTargetIndex(tgt);
      } catch (err: any) {
        if (err instanceof DomainError) throw Object.assign(new Error(err.message), { status: 400 });
        throw err;
      }
      if ((tgt.localIndex ?? 0) >= (targetContainer.capacity || 0))
        throw Object.assign(new Error('Target index exceeds container capacity'), { status: 400 });

      if (moving.isContainer) {
        const wouldDescend = await this.containerIsDescendantOfItem(tgt.containerId, moving.id);
        if (wouldDescend)
          throw Object.assign(new Error('Cannot place a container into itself or its nested containers'), { status: 400 });
      }

      if (targetContainer.containerType) {
        const ttype = String(targetContainer.containerType).toUpperCase();
        const itype = moving.itemType ? String(moving.itemType).toUpperCase() : '';
        if (ttype === 'LIQUID' && itype !== 'LIQUID')
          throw Object.assign(new Error('Only liquid items can be placed in this container'), { status: 400 });
        if (ttype === 'CONSUMABLES' && itype !== 'CONSUMABLE' && itype !== 'FOOD')
          throw Object.assign(new Error('Only consumable items can be placed in this container'), { status: 400 });
      }
    }

    const occupied = await this.repository.findItemAtPosition({
      containerId: tgt ? tgt.containerId ?? null : null,
      localIndex: tgt ? tgt.localIndex ?? null : null,
    });

    if (occupied && occupied.id !== moving.id) {
      const sameContainer = src.containerId === tgt?.containerId;
      await this.repository.runInTransaction(async (txRepo) => {
        if (sameContainer) {
          await txRepo.updateItemPosition(moving.id, {
            containerId: src.containerId ?? null,
            containerIndex: InventoryApplicationService.TEMP_INDEX,
          });
          await txRepo.updateItemPosition(occupied.id, {
            containerId: src.containerId ?? null,
            containerIndex: src.localIndex ?? null,
          });
          await txRepo.updateItemPosition(moving.id, {
            containerId: tgt?.containerId ?? null,
            containerIndex: tgt?.localIndex ?? null,
          });
        } else {
          await txRepo.updateItemPosition(occupied.id, {
            containerId: src.containerId ?? null,
            containerIndex: src.localIndex ?? null,
          });
          await txRepo.updateItemPosition(moving.id, {
            containerId: tgt?.containerId ?? null,
            containerIndex: tgt?.localIndex ?? null,
          });
        }
      });
    } else {
      await this.repository.updateItemPosition(moving.id, {
        containerId: tgt ? tgt.containerId ?? null : null,
        containerIndex: tgt ? tgt.localIndex ?? null : null,
      });
    }

    const containers = await this.repository.fetchContainersWithItems(character.id);
    return containers.map((c) => this.mapContainer(c));
  }

  async placeItem(character: CharacterLike, payload: PlaceItemDto | null | undefined) {
    if (!payload || !payload.itemId || !payload.destination)
      throw Object.assign(new Error('Invalid payload'), { status: 400 });

    const itemId = Number(payload.itemId);
    const destination = payload.destination;

    const moving = await this.repository.findItemById(itemId);
    if (!moving) throw Object.assign(new Error('Item not found'), { status: 404 });
    if (moving.characterId !== character.id)
      throw Object.assign(new Error('Item does not belong to the active character'), { status: 403 });

    if (destination.type === 'equipment') {
      return this.equipmentGateway.performEquipForCharacter(character.id, itemId, destination.slotId);
    }

    if (destination.type === 'container') {
      if (!destination.containerId)
        throw Object.assign(new Error('Missing containerId'), { status: 400 });
      const targetIndex =
        typeof destination.index === 'number'
          ? destination.index
          : (destination.localIndex as number | undefined);
      if (typeof targetIndex !== 'number')
        throw Object.assign(new Error('Missing target index'), { status: 400 });

      const equipRow = await this.repository.findEquipmentRowByItemId(itemId);
      if (equipRow) {
        await this.equipmentGateway.unequipItemToContainer(
          equipRow.characterId,
          itemId,
          Number(destination.containerId),
          Number(targetIndex),
        );
        const containers = await this.fetchContainersWithItems(character.id);
        const equipment = await this.repository.listEquipmentForCharacter(character.id);
        return { equipment, containers };
      }

      const moved = await this.moveItemForCharacter(character, {
        itemId,
        source: null,
        target: { containerId: Number(destination.containerId), localIndex: Number(targetIndex) },
      });
      return { containers: moved };
    }

    throw Object.assign(new Error('Invalid destination type'), { status: 400 });
  }

  private mapContainer(container: ContainerWithItems) {
    return {
      id: container.id,
      name: container.name || null,
      label: container.label || null,
      capacity: container.capacity || 0,
      containerType: container.containerType || 'BASIC',
      nestable: !!container.nestable,
      itemId: container.itemId ?? null,
      items: (container.items || []).map(this.mapItemForClient),
    };
  }
}

export type InventoryApplicationServiceFactory = (deps: {
  repository: InventoryRepository;
  equipmentGateway: EquipmentGateway;
}) => InventoryApplicationService;

export const createInventoryApplicationService: InventoryApplicationServiceFactory = ({
  repository,
  equipmentGateway,
}) => new InventoryApplicationService(repository, equipmentGateway);
