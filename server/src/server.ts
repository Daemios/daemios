import app from './app';
import './lib/socket';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
