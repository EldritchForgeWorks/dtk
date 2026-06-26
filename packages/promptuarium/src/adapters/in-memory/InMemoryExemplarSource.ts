import type { IExemplarSource, RawExemplar } from '../../ports/IExemplarSource.js';

export class InMemoryExemplarSource implements IExemplarSource {
  constructor(private readonly fixtures: RawExemplar[]) {}

  list(): Promise<RawExemplar[]> {
    return Promise.resolve([...this.fixtures]);
  }
}
