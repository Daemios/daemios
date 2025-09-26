import { HttpError } from '../../utils/httpError';
import { userRepository } from './user.repository';
import bcrypt from 'bcrypt';
export const userService = {
    async createUser(email, password, displayName) {
        const existing = await userRepository.findByEmail(email);
        if (existing)
            throw new HttpError(409, 'Email already registered');
        const hashed = await bcrypt.hash(password, 10);
        const user = await userRepository.create({ email, password: hashed, displayName });
        return user;
    },
    async getUser(id) {
        const user = await userRepository.findById(id);
        if (!user)
            throw new HttpError(404, 'User not found');
        return user;
    },
};
