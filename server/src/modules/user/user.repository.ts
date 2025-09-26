import { prisma } from '../../db/prisma';

export const userRepository = {
  create: (data: { email: string; password: string; displayName: string }) => prisma.user.create({ data }),
  findById: (id: number) => prisma.user.findUnique({ where: { id } }),
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
};
