// Load environment variables if not in production
import dotenv from 'dotenv';

// Import necessary modules
import cors from 'cors';
import express from 'express';
import passport from 'passport';
import logger from 'morgan';
import expressSession from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import open from './routes/open.js';

import initializePassport from './passport-config.js';

import { isAuth } from './middleware/user.js';
import userRoutes from './routes/user.js';
import dataRoutes from './routes/data.js';
import inventoryRoutes from './routes/inventory.js';
import abilityRoutes from './routes/ability.js';
import arenaRoutes from './routes/arena.js';
import worldRoutes from './routes/world.js';
import dmRoutes from './routes/dm.js';
import characterEquipRoutes from './routes/characterEquip.js';
import prisma from './lib/prisma.js';


if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Initialize express application
const app = express();

// Allow CORS for specified origin
app.use(cors({
  origin: 'http://localhost:8080', // Allowed origin
  credentials: true, // Allow credentials
}));

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: false }));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware for logging HTTP requests
app.use(logger('dev'));

// Middleware to handle sessions, using MySQL as the store
app.use(
  expressSession({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // ms
    },
    secret: 'a santa at nasa',
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000, // ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      },
    ),
  }),
);

// Initialize Passport with session support
app.use(passport.initialize({ session: true }));

// Enable persistent login sessions with Passport
app.use(passport.session());

// Initialize Passport configuration
initializePassport(passport);

// Non-authenticated routes
app.use('/open', open);

// Middleware to check for authentication
app.use(isAuth);

// Authenticated routes
app.use('/user', userRoutes);
app.use('/data', dataRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/ability', abilityRoutes);
app.use('/arena', arenaRoutes);
app.use('/world', worldRoutes);
app.use('/character', characterEquipRoutes);


app.listen(3000, () => {
  console.log('Listening for requests');
});

