import type { ILLMClient } from '../../ports/ILLMClient.js';

export class StubLLMClient implements ILLMClient {
  callCount = 0;
  lastInput: { text: string; hint: string } | undefined;

  private readonly transform: (text: string) => string;

  constructor(transform?: (text: string) => string) {
    this.transform = transform ?? (t => t);
  }

  polish(text: string, hint: string): Promise<string> {
    this.callCount++;
    this.lastInput = { text, hint };
    return Promise.resolve(this.transform(text));
  }
}
