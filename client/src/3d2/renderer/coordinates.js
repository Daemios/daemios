import { axialToXZ as layoutAxialToXZ, worldXZToAxial, roundAxial } from '@/3d2/config/layout';

// Renderer-scoped coordinate helpers.
export const axialToXZ = layoutAxialToXZ;
export const XZToAxial = worldXZToAxial;
export { roundAxial };

export default { axialToXZ, XZToAxial, roundAxial };
