import 'express-session';
import { IncomingMessage } from 'http';

declare module 'express-session' {
  interface SessionData {
    // encounter stored by DM routes during combat
    encounter?: any;
    // Keep passport shape compatible with original app
    passport?: {
      user?: { id: number } | any;
    };
    // optional activeCharacter convenience
    activeCharacter?: any;
  }
}

declare module 'express' {
  interface Request {
    session: import('express-session').Session & import('express-session').SessionData;
  }
}
