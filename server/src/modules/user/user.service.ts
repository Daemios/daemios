import bcrypt from 'bcrypt';
import { userRepository } from './user.repository';
import { DomainError, newUser } from './user.domain';

// Hash a password using bcrypt
export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Create a user ensuring unique email
// Accept either (email, password, displayName) or a single payload object
export async function createUser(emailOrPayload: any, password?: string, displayName?: string) {
  const payload = typeof emailOrPayload === 'object' && emailOrPayload !== null
    ? emailOrPayload
    : { email: emailOrPayload, password, displayName };

  const { email, password: pwd, displayName: dn } = payload as { email: string; password: string; displayName: string };

  const existing = await userRepository.findByEmail(email);
  if (existing) throw new DomainError('EMAIL_IN_USE', 'Email already registered');

  const hashed = await hashPassword(pwd);
  const entity = newUser({ email, displayName: dn, passwordHash: hashed });
  return userRepository.create({ email: entity.email, password: entity.passwordHash, displayName: entity.displayName });
}

// Fetch user by id or email
// Accept either id (number), email (string) or an object {id, email}
export async function getUser(idOrEmailOrPayload: any) {
  if (typeof idOrEmailOrPayload === 'number') return userRepository.findById(idOrEmailOrPayload);
  if (typeof idOrEmailOrPayload === 'string') return userRepository.findByEmail(idOrEmailOrPayload);
  if (idOrEmailOrPayload && typeof idOrEmailOrPayload === 'object') {
    const { id, email } = idOrEmailOrPayload as any;
    if (id != null) return userRepository.findById(id);
    if (email != null) return userRepository.findByEmail(email);
  }
  return null;
}

// Validate registration form payload
export const validateRegistration = ({ email, password, passwordConfirm, displayName }: any) => {
  if (!email || !password || !passwordConfirm || !displayName) return 'All fields are required';
  if (password !== passwordConfirm) return 'Passwords do not match';
  if (password.length < 5) return 'Password must be at least 5 characters';
  return null;
};

export const userService = {
  hashPassword,
  createUser,
  getUser,
  validateRegistration,
};

