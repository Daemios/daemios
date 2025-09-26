import { PrismaClient } from '@prisma/client';
export const prisma = global.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
});
if (process.env.NODE_ENV !== 'production')
    global.prisma = prisma;
