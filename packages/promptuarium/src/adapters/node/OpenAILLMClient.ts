import type { ILLMClient } from '../../ports/ILLMClient.js';

export interface OpenAIClientConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl?: string;
}

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
}

export class OpenAILLMClient implements ILLMClient {
  private readonly baseUrl: string;

  constructor(private readonly config: OpenAIClientConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com';
  }

  async polish(text: string, hint: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: `You are a game text editor. Polish the following ${hint} description for clarity and style. Return only the improved text, no commentary.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ChatResponse;
    return data.choices[0]?.message.content ?? text;
  }
}
