import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var __daemiosPrisma: PrismaClient | undefined;
}

export const prisma: any = global.__daemiosPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') global.__daemiosPrisma = prisma;

export default prisma;
