#!/usr/bin/env node
// Node-clean smoke test (publish-alea-domain, tasks 5.1/5.2).
//
// Run in a plain `node` subprocess with ZERO Foundry globals defined — no
// `game`, no `Hooks`, no `CONFIG`, no jsdom/Foundry shim of any kind. This is
// the whole point: it proves the published npm surface
// (dist/domain/**, dist/adapters/in-memory/**, dist/AleaApi.js) never
// touches Foundry globals, because if anything transitively imported
// src/adapters/foundry/** (which reads `declare const game`/`Hooks` as real
// globals at module scope in some adapters), evaluating that import would
// throw a ReferenceError immediately — before any assertion below even runs.
//
// Imports from the BUILT `dist/` output (via the same relative paths the
// package's `exports` map resolves to), not from `src/`, so this exercises
// the actual artifact `npm publish` would ship — not just the source.
//
// Prerequisite: `npm run build` must have already run in this package
// (produces dist/domain/index.js + dist/adapters/in-memory/index.js).
//
// Usage: node scripts/smoke-node-clean.mjs
// Exit 0 + "SMOKE OK" on success; non-zero exit + stack trace on failure.

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distDomain = resolve(here, '../dist/domain/index.js');
const distInMemory = resolve(here, '../dist/adapters/in-memory/index.js');

for (const p of [distDomain, distInMemory]) {
  if (!existsSync(p)) {
    console.error(`SMOKE FAIL: ${p} does not exist — run "npm run build" first.`);
    process.exit(1);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`SMOKE ASSERTION FAILED: ${message}`);
  }
}

async function main() {
  // These imports are the acceptance bar: if RitusRegistry, SequenceExecutor,
  // ExpressionParser, RollResolver, or any in-memory adapter transitively
  // pulled in src/adapters/foundry/**, one of these two dynamic imports
  // would throw a ReferenceError (game/Hooks/CONFIG undefined) right here.
  const { RitusRegistry, ExpressionParser, RollResolver, SequenceExecutor } = await import(distDomain);
  const { DeterministicDiceRoller, InMemoryCombatStateStore, SpyHookEmitter } = await import(distInMemory);

  // --- Compose the executor from in-memory ports only, exactly as Officina's
  //     dry-run-preview (M2) would in a Node-hosted authoring-time preview. ---
  const roller = new DeterministicDiceRoller();
  const store = new InMemoryCombatStateStore();
  const emitter = new SpyHookEmitter();
  const registry = new RitusRegistry();
  const parser = new ExpressionParser();
  const resolver = new RollResolver(roller, parser);
  const executor = new SequenceExecutor(resolver, store, emitter, registry, parser);

  registry.register({ id: 'simple', mechanic: 'pool', threshold: 5, tiers: { hit: 1 } });

  // --- Minimal 2-step fixture: one rule step, one await step. ---
  const exemplar = {
    id: 'seq-smoke',
    systemId: 'simple',
    steps: [
      { type: 'rule', id: 'attack', pool: '2' },
      { type: 'await', id: 'decision', choices: ['dodge', 'tank'] },
    ],
  };
  const context = {
    systemId: 'simple',
    sequenceExemplarId: exemplar.id,
    sequenceExemplar: exemplar,
    initiator: { id: 'actor-1', name: 'Test Actor', system: {} },
    targets: [],
    item: null,
    combat: null,
  };

  // Two dice at face 5, threshold 5 → 2 hits → tiers={hit:1} → tier 'hit'.
  roller.enqueue([5, 5]);
  await executor.execute(context);

  // --- Assert dtk-alea.step ---
  const stepCalls = emitter.callsFor('dtk-alea.step');
  assert(stepCalls.length === 1, `expected 1 dtk-alea.step call, got ${stepCalls.length}`);
  const stepPayload = stepCalls[0].payload;
  assert(stepPayload.stepId === 'attack', `stepId: expected "attack", got "${stepPayload.stepId}"`);
  assert(stepPayload.tier === 'hit', `tier: expected "hit", got "${stepPayload.tier}"`);
  assert(stepPayload.hits === 2, `hits: expected 2, got ${stepPayload.hits}`);
  assert(stepPayload.pool === 2, `pool: expected 2, got ${stepPayload.pool}`);

  // --- Assert dtk-alea.await (execution suspended, not complete) ---
  const awaitCalls = emitter.callsFor('dtk-alea.await');
  assert(awaitCalls.length === 1, `expected 1 dtk-alea.await call, got ${awaitCalls.length}`);
  const awaitPayload = awaitCalls[0].payload;
  assert(awaitPayload.stepId === 'decision', `await stepId: expected "decision", got "${awaitPayload.stepId}"`);
  assert(
    JSON.stringify(awaitPayload.choices) === JSON.stringify(['dodge', 'tank']),
    `await choices: expected ["dodge","tank"], got ${JSON.stringify(awaitPayload.choices)}`,
  );
  assert(awaitPayload.actorId === 'actor-1', `await actorId: expected "actor-1", got "${awaitPayload.actorId}"`);
  assert(typeof awaitPayload.sequenceId === 'string' && awaitPayload.sequenceId.length > 0, 'await sequenceId must be a non-empty string');
  assert(emitter.callsFor('dtk-alea.complete').length === 0, 'dtk-alea.complete must NOT fire while suspended on await');
  assert(store.size() === 1, `expected 1 suspended execution in store, got ${store.size()}`);

  // --- Resume with a choice; the rest of the sequence (none) then completes. ---
  await executor.resume(awaitPayload.sequenceId, 'dodge');

  const completeCalls = emitter.callsFor('dtk-alea.complete');
  assert(completeCalls.length === 1, `expected 1 dtk-alea.complete call after resume, got ${completeCalls.length}`);
  const completePayload = completeCalls[0].payload;
  assert(completePayload.exemplarId === 'seq-smoke', `complete exemplarId: expected "seq-smoke", got "${completePayload.exemplarId}"`);
  assert(completePayload.stepOutputs['decision.choice'] === 'dodge', `complete stepOutputs['decision.choice']: expected "dodge", got ${JSON.stringify(completePayload.stepOutputs['decision.choice'])}`);
  assert(completePayload.stepOutputs['attack'] !== undefined, 'complete stepOutputs must include the "attack" roll result');
  assert(store.size() === 0, `expected store to be emptied after complete, got size ${store.size()}`);

  console.log('SMOKE OK — dtk-alea.step / dtk-alea.await / dtk-alea.complete all observed with expected shapes, zero Foundry globals touched.');
}

main().catch((err) => {
  console.error('SMOKE FAIL');
  console.error(err.stack ?? err);
  process.exit(1);
});
