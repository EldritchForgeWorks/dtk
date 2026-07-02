// Foundry module entry point — requires live Foundry VTT environment.
// This file is excluded from unit test coverage.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Hooks: any;
declare const game: any;

import { ModuleCoordinator } from './domain/services/ModuleCoordinator.js';
import { DtkModuleEntry } from './domain/entities/DtkModuleEntry.js';

const coordinator = new ModuleCoordinator();

Hooks.once('init', () => {
  game.dtk = {
    register({ id, version, api }: { id: string; version: string; api: unknown }): void {
      coordinator.register(new DtkModuleEntry(id, version, api));
    },
    getApi<T>(moduleId: string): T | undefined {
      return coordinator.getApi<T>(moduleId);
    },
    isInstalled(moduleId: string): boolean {
      return coordinator.isInstalled(moduleId);
    },
    pendingModules(): string[] {
      return coordinator.pendingModules();
    },
  };
  console.log('[DTK] Hub initialized — game.dtk ready');
});

Hooks.once('ready', () => {
  Hooks.callAll('dtk.ready', { dtk: game.dtk });
  console.log('[DTK] dtk.ready fired');
});
