export interface RawExemplar {
  readonly filePath: string;
  readonly data: unknown;
}

export interface IExemplarSource {
  list(): Promise<RawExemplar[]>;
}
