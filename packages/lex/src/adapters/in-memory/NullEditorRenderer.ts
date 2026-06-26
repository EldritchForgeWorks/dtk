import type { IEditorRenderer, EditorOptions } from '../../ports/IEditorRenderer.js';

export class NullEditorRenderer implements IEditorRenderer {
  constructor(private readonly fixture: string | null = null) {}

  open(_options: EditorOptions): Promise<string | null> {
    return Promise.resolve(this.fixture);
  }
}
