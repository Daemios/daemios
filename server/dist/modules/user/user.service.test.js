import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from './user.service';
import * as repo from './user.repository';
import { HttpError } from '../../utils/httpError';
describe('userService', () => {
    beforeEach(() => { vi.restoreAllMocks(); });
    it('throws 409 when email exists', async () => {
        vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue({ id: 1, email: 'a@b.com', displayName: 'A' });
        await expect(userService.createUser('a@b.com', 'secret', 'A')).rejects.toEqual(new HttpError(409, 'Email already registered'));
    });
    it('creates when unique', async () => {
        vi.spyOn(repo.userRepository, 'findByEmail').mockResolvedValue(null);
        vi.spyOn(repo.userRepository, 'create').mockResolvedValue({ id: 2, email: 'c@d.com', displayName: 'Z' });
        // mock bcrypt.hash to return a stable value
        const bcrypt = await import('bcrypt');
        vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-secret');
        const user = await userService.createUser('c@d.com', 'secret', 'Z');
        expect(user.email).toBe('c@d.com');
    });
    it('getUser throws 404', async () => {
        vi.spyOn(repo.userRepository, 'findById').mockResolvedValue(null);
        await expect(userService.getUser(999)).rejects.toEqual(new HttpError(404, 'User not found'));
    });
});
