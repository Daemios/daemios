// Minimal entity runtime helpers for domain use. Use JSDoc for light typing.

/** @typedef {{q:number,r:number}} Axial */
/** @typedef {{id:string,type:string,pos:Axial,data?:Object}} WorldEntity */

let nextId = 1;

/**
 * Create a lightweight entity for the world.
 * @param {string} type
 * @param {{q:number,r:number}} pos
 * @param {Object} [data]
 * @returns {WorldEntity}
 */
export function makeEntity(type, pos, data) {
  return { id: `e${nextId++}`, type, pos, data };
}

export default { makeEntity };
