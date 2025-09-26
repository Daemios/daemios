import app from './app';
import { createServer } from 'http';
import createWSServer from './lib/socket';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
