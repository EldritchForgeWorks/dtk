export interface Exemplar {
  id: string
  name: string
  kind: string
  data: Record<string, unknown>
}

export interface IExemplarQuery {
  query(kind: string): Promise<Exemplar[]>
}
