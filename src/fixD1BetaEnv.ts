import { D1Database as D1DatabaseClass } from "../vendor/D1Database";

// from https://github.com/cloudflare/wrangler2/issues/2335#issuecomment-1352344893
export function fixD1BetaEnv<T = any>(env: T): T {
  const _env: any = { ...env };
  const prefix = "__D1_BETA__";
  for (const k in env) {
    if (k.startsWith(prefix)) {
      _env[k.slice(prefix.length)] = _env[k].prepare ? _env[k] : new D1DatabaseClass(_env[k]);
    }
  }
  return _env;
}