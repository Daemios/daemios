import { prisma } from '../../db/prisma';
export async function createAbilityElement(payload) {
    return prisma.abilityElement.create({ data: { name: payload.name || null, icon: payload.icon || null, effect: payload.effect || null, tag: payload.tag || null, damage: payload.damage || null, healing: payload.healing || null, debuff: payload.debuff || null, buff: payload.buff || null, color: payload.color || null } });
}
export async function listAbilityElements() {
    return prisma.abilityElement.findMany();
}
export async function getAbilityElement(id) {
    return prisma.abilityElement.findUnique({ where: { id } });
}
export async function updateAbilityElement(id, data) {
    return prisma.abilityElement.update({ where: { id }, data });
}
export async function deleteAbilityElement(id) {
    return prisma.abilityElement.delete({ where: { id } });
}
