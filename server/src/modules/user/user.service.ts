import bcrypt from 'bcrypt';
import { userRepository } from './user.repository';
import { DomainError, newUser } from './user.domain';

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export async function createUser({ email, password, displayName }: { email: string; password: string; displayName: string }) {
  // Policy: check uniqueness at the orchestration layer
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new DomainError('EMAIL_IN_USE', 'Email already registered');

  const hashed = await hashPassword(password);
  const entity = newUser({ email, displayName, passwordHash: hashed });
  return userRepository.create({ email: entity.email, password: entity.passwordHash, displayName: entity.displayName });
}

export async function getUser({ id, email }: { id?: number; email?: string }) {
  if (id != null) return userRepository.findById(id);
  if (email != null) return userRepository.findByEmail(email);
  return null;
}

export const validateRegistration = ({ email, password, passwordConfirm, displayName }: any) => {
  if (!email || !password || !passwordConfirm || !displayName) return 'All fields are required';
  if (password !== passwordConfirm) return 'Passwords do not match';
  if (password.length < 5) return 'Password must be at least 5 characters';
  return null;
};

export default { hashPassword, createUser, getUser, validateRegistration };

export const userService = {
  createUser: (email: string, password: string, displayName: string) => createUser({ email, password, displayName }),
  getUser: async (idOrEmail: any) => {
    let result = null as any;
    if (typeof idOrEmail === 'number') result = await getUser({ id: idOrEmail });
    else if (typeof idOrEmail === 'string') result = await getUser({ email: idOrEmail });
    return result;
  },
};

