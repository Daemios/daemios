export const isEmail = (v: unknown) => typeof v === 'string' && /.+@.+\..+/.test(v);
export const isNonEmptyString = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
export const isCuidLike = (v: unknown) => typeof v === 'string' && /^[a-z0-9]{25,}$/i.test(v);

export type Rule = {
  in: 'body' | 'params' | 'query';
  key: string;
  optional?: boolean;
  validate?: (v: unknown) => boolean;
  coerce?: (v: unknown) => unknown;
  message?: string;
};
export type Rules = Rule[];

export function runRules(req: any, rules: Rules) {
  const errors: string[] = [];
  for (const r of rules) {
    const bag = req[r.in] ?? {};
    let val = bag[r.key];
    if (val == null || val === '') {
      if (r.optional) continue;
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
