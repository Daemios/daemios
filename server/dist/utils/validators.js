export const isEmail = (v) => typeof v === 'string' && /.+@.+\..+/.test(v);
export const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
export const isCuidLike = (v) => typeof v === 'string' && /^[a-z0-9]{25,}$/i.test(v);
export function runRules(req, rules) {
    const errors = [];
    for (const r of rules) {
        const bag = req[r.in] ?? {};
        let val = bag[r.key];
        if (val == null || val === '') {
            if (r.optional)
                continue;
            errors.push(`${r.in}.${r.key} is required`);
            continue;
        }
        if (r.coerce) {
            val = r.coerce(val);
            bag[r.key] = val;
        }
        if (r.validate && !r.validate(val)) {
            errors.push(r.message ?? `${r.in}.${r.key} is invalid`);
        }
    }
    return errors;
}
