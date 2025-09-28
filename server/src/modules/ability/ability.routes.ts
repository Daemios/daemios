import { Router } from 'express';
import { postCreate, getList, getOne, putUpdate, delOne, getShapes, getRanges, getTypes } from './ability.controller';
import { validate } from '../../middlewares/validate';
import { abilityIdRules, createAbilityRules, updateAbilityRules } from './ability.validators';

const router = Router();

router.post('/', validate(createAbilityRules), postCreate);
router.get('/', getList);
router.get('/elements', getList);
router.get('/shapes', getShapes);
router.get('/ranges', getRanges);
router.get('/types', getTypes);
router.get('/:id', validate(abilityIdRules), getOne);
router.put('/:id', validate([...abilityIdRules, ...updateAbilityRules]), putUpdate);
router.delete('/:id', validate(abilityIdRules), delOne);

export default router;
