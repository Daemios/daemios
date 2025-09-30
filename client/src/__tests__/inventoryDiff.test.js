import { describe, it, expect, vi } from "vitest";
import { applyInventoryDiff } from "../utils/inventoryDiff";

function makeStores() {
  const inventory = [
    {
      id: "A",
      items: [{ id: "a1", containerIndex: 0, label: "old" }],
      capacity: 10,
    },
    { id: "B", items: [{ id: "b1", containerIndex: 0 }], capacity: 5 },
  ];
  const character = { equipped: { head: null } };

  const stores = {};
  stores.inventory = JSON.parse(JSON.stringify(inventory));
  stores.character = JSON.parse(JSON.stringify(character));
  stores.setInventory = vi.fn((inv) => {
    stores.inventory = inv;
  });
  stores.setCharacter = vi.fn((c) => {
    stores.character = c;
  });
  stores.setNestableInventory = vi.fn();
  stores.mapItemForClient = (it) => ({
    id: it.id ?? it.itemId,
    label: it.label ?? it.name,
    img: it.img ?? it.image ?? "/img/debug/placeholder.png",
    containerIndex: it.containerIndex ?? it.index,
  });

  return stores;
}

describe("applyInventoryDiff", () => {
  it("applies full authoritative containers replacement", async () => {
    const stores = makeStores();
    const diff = {
      containers: [
        {
          id: "A",
          items: [{ id: "a2", containerIndex: 0, label: "new" }],
          capacity: 12,
        },
      ],
    };

    const res = await applyInventoryDiff(diff, stores);

    expect(stores.setInventory).toHaveBeenCalled();
    // inventory replaced and contains only container A
    expect(stores.inventory.map((c) => c.id)).toEqual(["A"]);
    // applied contains container A
    expect(res.applied.containerIds).toContain("A");
  });

  it("applies partial slot update only to specified container", async () => {
    const stores = makeStores();

    const diff = {
      containers: {
        B: {
          slots: {
            0: { id: "b2", containerIndex: 0, label: "b-new" },
          },
        },
      },
    };

    const beforeA = JSON.parse(
      JSON.stringify(stores.inventory.find((c) => c.id === "A"))
    );

    const res = await applyInventoryDiff(diff, stores);

    // setInventory called
    expect(stores.setInventory).toHaveBeenCalled();

    // Container A should remain unchanged
    const afterA = stores.inventory.find((c) => c.id === "A");
    expect(afterA.items[0].id).toBe(beforeA.items[0].id);

    // Container B should be updated with b2
    const afterB = stores.inventory.find((c) => c.id === "B");
    expect(afterB.items.some((it) => it.id === "b2")).toBe(true);

    // applied includes only B
    expect(res.applied.containerIds).toEqual(["B"]);
  });

  it("applies equipment updates to character", async () => {
    const stores = makeStores();

    const diff = {
      equipment: [{ slot: "head", Item: { id: "helm1", label: "Helm" } }],
    };

    const res = await applyInventoryDiff(diff, stores);

    expect(stores.setCharacter).toHaveBeenCalled();
    expect(stores.character.equipped.head.id).toBe("helm1");
    expect(res.applied.equipmentSlots).toContain("head");
  });
});
