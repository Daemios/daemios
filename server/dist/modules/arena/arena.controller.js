import * as service from './arena.service';
export async function list(req, res) {
    const arenas = await service.listArenaHistories();
    const active = await service.getActiveArenaHistory();
    res.send({ active_arena_history_id: active ? active.arena_history_id : null, saved_arenas: arenas });
}
export async function single(req, res) {
    const rows = await service.findArenaHistoryById(req.params.id);
    res.send(rows);
}
export async function remove(req, res) {
    if (!req.params.id)
        return res.status(400).send('Missing args for arena/delete');
    await service.deleteArenaHistoryById(req.params.id);
    const rows = await service.listArenaHistories();
    res.send(rows);
}
export async function load(req, res) {
    const rows = await service.findArenaHistoryById(req.params.id);
    if (!rows || rows.length === 0)
        return res.status(404).send('Not found');
    await service.updateArenaLastActive(rows[0].arena_history_id);
    const arenas = await service.listArenaHistories();
    const active = await service.getActiveArenaHistory();
    // clear any cached terrain on the app locals if present
    if (req.app && req.app.locals && req.app.locals.arena)
        req.app.locals.arena.terrain = null;
    res.send({ active_arena_history_id: active ? active.arena_history_id : null, saved_arenas: arenas });
}
export async function create(req, res) {
    const { name, size } = req.body || {};
    if (!name || !size)
        return res.status(400).send('Missing required fields');
    // generate a seed server-side for parity with legacy
    const seed = req.seed || Math.random().toString(36).slice(2);
    await service.createArenaHistory({ name, seed, size: Number(size) });
    const arenas = await service.listArenaHistories();
    if (req.app && req.app.locals && req.app.locals.arena)
        req.app.locals.arena.terrain = null;
    res.send(arenas);
}
