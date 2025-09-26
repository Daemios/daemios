import 'express-session';

declare module 'express-session' {
  interface SessionData {
    encounter?: any;
  }
}

// Clean module declarations for world subroutes used by relative imports
declare module './world/locations' {
  import { Router } from 'express';
  const value: Router;
  export default value;
}

declare module './world/towns' {
  import { Router } from 'express';
  const value: Router;
  export default value;
}

declare module './world/dungeons' {
  import { Router } from 'express';
  const value: Router;
  export default value;
}

// Top-level module names used in some imports
declare module 'src/routes/world/locations' {
  import { Router } from 'express';
  const value: Router;
  export default value;
}

declare module 'src/routes/world/towns' {
  import { Router } from 'express';
  const value: Router;
  export default value;
}

declare module 'src/routes/world/dungeons' {
  import { Router } from 'express';
  const value: Router;
  export default value;
}
