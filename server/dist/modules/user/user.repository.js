import { prisma } from '../../db/prisma';
export const userRepository = {
    create: (data) => prisma.user.create({ data }),
    findById: (id) => prisma.user.findUnique({ where: { id } }),
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
};
