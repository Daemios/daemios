import { HttpError } from '../utils/httpError';
import { Prisma } from '@prisma/client';
export function errorMiddleware(err, _req, res, _next) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002')
            return res.status(409).json({ error: 'Unique constraint failed' });
        return res.status(400).json({ error: 'Database error' });
    }
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
}
