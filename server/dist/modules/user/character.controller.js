import { characterService, buildCharacterWithEquipment } from './character.service';
import { prisma } from '../../db/prisma';
export const characterController = {
    logout: async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await characterService.deactivateCharacters(req.user.id);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            req.logout(() => res.json({ success: true }));
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error during logout' });
        }
    },
    refresh: async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const userId = req.session.passport.user.id;
            const character = await characterService.getActiveCharacterForUser(userId);
            if (!character || !character.id)
                return res.status(404).json({ error: 'No active character found' });
            try {
                const charWithEquip = await buildCharacterWithEquipment(character);
                res.json({ success: true, character: charWithEquip });
            }
            catch (e) {
                console.warn('Failed to load equipment for character', character.id, e);
                res.json({ success: true, character });
            }
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: 'An error occurred' });
        }
    },
    selectCharacter: async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const userId = req.session.passport.user.id;
            const { characterId } = req.body;
            await characterService.deactivateCharacters(userId);
            const rows = await characterService.activateCharacter(userId, characterId);
            if (!rows || rows.count === 0)
                return res.status(404).json({ error: 'No character found or updated' });
            const character = await characterService.getActiveCharacterForUser(userId);
            if (!character || !character.id)
                return res.status(404).json({ error: 'No active character found' });
            try {
                const charWithEquip = await buildCharacterWithEquipment(character);
                let containers = [];
                try {
                    containers = await prisma.container.findMany({ where: { characterId: character.id }, include: { items: { orderBy: { containerIndex: 'asc' } } } });
                    containers = containers.map((c) => ({
                        ...c,
                        containerType: c.containerType || 'BASIC',
                        icon: (function t(tpe) {
                            const tstr = String(tpe || 'BASIC').toUpperCase();
                            switch (tstr) {
                                case 'LIQUID': return 'water';
                                case 'CONSUMABLES': return 'food-apple';
                                case 'PACK': return 'backpack';
                                case 'POCKETS': return 'hand';
                                default: return null;
                            }
                        }(c.containerType)),
                        items: (c.items || []).map((it) => ({ ...it, img: it.image || it.img || '/img/debug/placeholder.png', label: it.label || it.name || null })),
                    }));
                }
                catch (e) {
                    console.warn('user.select: could not fetch containers for character', e?.code);
                }
                res.json({ success: true, character: charWithEquip, containers });
            }
            catch (e) {
                console.warn('Failed to load equipment for character', character.id, e);
                res.json({ success: true, character });
            }
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: 'An error occurred' });
        }
    },
    createCharacter: async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const userId = req.session.passport.user.id;
            const { name, raceId, image } = req.body;
            const createdChar = await characterService.createCharacterForUser(userId, { name, raceId, image });
            res.status(200).json({ success: true, character: createdChar });
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    listCharacters: async (req, res) => {
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const userId = req.session.passport.user.id;
            const rows = await characterService.listCharactersForUser(userId);
            const characterList = rows.map((row) => ({
                ...row,
                location: { dangerous: true, name: 'The Wilds' },
                level: 1,
                vessels: [{ color: '#156156' }, { color: '#a12078' }],
            }));
            res.json({ success: true, characters: characterList });
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Server Error' });
        }
    },
};
