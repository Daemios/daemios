import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
import logger from 'morgan';
import expressSession from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { userRouter } from './modules/user/user.routes';
import { inventoryRouter } from './modules/inventory';
import equipmentRouter from './routes/equipment';
import { abilityRouter } from './modules/ability';
import { dataRouter } from './modules/data';
import { worldRouter } from './modules/world';
import { dmRouter } from './modules/dm';
import { arenaRouter } from './modules/arena';
import { errorMiddleware } from './middlewares/error';
import openRouter from './routes/open';
import initializePassport from './passport-config';
import { isAuth } from './middlewares/user';
import { prisma } from './db/prisma';
dotenv.config();
export const app = express();
app.use(cors({ origin: 'http://localhost:8080', credentials: true }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(logger('dev'));
app.use(expressSession({
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    secret: process.env.SESSION_SECRET || 'a santa at nasa',
    resave: true,
    saveUninitialized: true,
    // PrismaSessionStore expects a PrismaClient instance
    store: new PrismaSessionStore(prisma, {
        checkPeriod: 2 * 60 * 1000,
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
    }),
}));
app.use(passport.initialize());
app.use(passport.session());
initializePassport(passport);
// Open routes (no auth required)
app.use('/open', openRouter);
// Protected routes
app.use(isAuth);
app.use('/users', userRouter);
app.use('/inventory', inventoryRouter);
app.use('/character', equipmentRouter);
app.use('/ability', abilityRouter);
app.use('/data', dataRouter);
app.use('/world', worldRouter);
app.use('/dm', dmRouter);
app.use('/arena', arenaRouter);
app.get('/_health', (_req, res) => res.json({ ok: true }));
app.use(errorMiddleware);
export default app;
