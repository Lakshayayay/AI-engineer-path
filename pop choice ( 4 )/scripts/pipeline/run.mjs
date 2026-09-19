// Usage: node scripts/pipeline/run.mjs [extract|transform|load|all] [--limit N]
import { extractAll } from './extract.mjs';
import { transformAll } from './transform.mjs';
import { loadAll } from './load.mjs';

const args = process.argv.slice(2);
const stage = args.find((a) => !a.startsWith('--')) ?? 'all';
const i = args.indexOf('--limit');
const limit = i >= 0 ? Number(args[i + 1]) : undefined;

const stages = { extract: extractAll, transform: transformAll, load: loadAll };
const todo = stage === 'all' ? Object.keys(stages) : [stage];
if (todo.some((s) => !stages[s])) {
  console.error('Usage: run.mjs [extract|transform|load|all] [--limit N]');
  process.exit(1);
}
for (const s of todo) await stages[s]({ limit });
