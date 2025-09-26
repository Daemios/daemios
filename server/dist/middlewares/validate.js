import { runRules } from '../utils/validators';
import { HttpError } from '../utils/httpError';
export const validate = (rules) => (req, _res, next) => {
    const errs = runRules(req, rules);
    if (errs.length)
        throw new HttpError(400, errs.join('; '));
    next();
};
