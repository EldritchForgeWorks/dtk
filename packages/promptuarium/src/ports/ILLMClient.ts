export interface ILLMClient {
  polish(text: string, hint: string): Promise<string>;
}
