import type { IExemplarQuery, Exemplar } from '../../ports/IExemplarQuery'

export class StubExemplarQuery implements IExemplarQuery {
  constructor(private data: Map<string, Exemplar[]> = new Map()) {}

  query(kind: string): Promise<Exemplar[]> {
    return Promise.resolve(this.data.get(kind) ?? [])
  }
}
