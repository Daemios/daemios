import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const createUser = async ({ email, password, displayName }) => prisma.user.create({
  data: {
    email,
    password,
    displayName,
  },
});

export const getUser = async ({ id, email }) => {
  const whereClause = {};

  if (email) {
    whereClause.email = email;
  }

  if (id) {
    whereClause.id = id;
  }

  return prisma.user.findUnique({
    where: whereClause,
  });
};

export const validateRegistration = ({
  email, password, passwordConfirm, displayName,
}) => {
  if (!email || !password || !passwordConfirm || !displayName) {
    return 'All fields are required';
  }
  if (password !== passwordConfirm) {
    return 'Passwords do not match';
  }
  if (password.length < 5) {
    return 'Password must be at least 5 characters';
  }
  return null;
};
