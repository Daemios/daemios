import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import passport from 'passport';
import logger from 'morgan';
import expressSession from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';

import openRouter from './routes/open';
import { userRouter } from './modules/user';
import { dataRouter } from './modules/data';
import { inventoryRouter } from './modules/inventory';
import { abilityRouter } from './modules/ability';
import { arenaRouter } from './modules/arena';
import { worldRouter } from './modules/world';
import { dmRouter } from './modules/dm';
import { equipmentRouter } from './modules/equipment';

import initializePassport from './passport-config';
import { isAuth } from './middlewares/user';
import { prisma } from './db/prisma';
import verifyEnums from './db/verify-enums';

if (process.env.NODE_ENV !== 'production') dotenv.config();

verifyEnums();

const app = express();

app.use(cors({ origin: 'http://localhost:8080', credentials: true }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(logger('dev'));

app.use(
  expressSession({
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    secret: process.env.SESSION_SECRET || 'a santa at nasa',
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma as any, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  }),
);

app.use(passport.initialize());
app.use(passport.session());
initializePassport(passport);

app.use('/open', openRouter);
app.use(isAuth);

app.use('/user', userRouter);
app.use('/data', dataRouter);
app.use('/inventory', inventoryRouter);
app.use('/ability', abilityRouter);
app.use('/arena', arenaRouter);
app.use('/world', worldRouter);
app.use('/dm', dmRouter);
app.use('/character', equipmentRouter);

app.get('/_health', (_req, res) => res.json({ ok: true }));

export default app;


