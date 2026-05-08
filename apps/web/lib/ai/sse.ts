/**
 * Streaming SSE consumer for the AI chat endpoint.
 *
 * The proxy emits standard SSE frames: `event: chunk\ndata: ...\n\n`.
 * We parse them incrementally and emit text deltas via the onChunk callback.
 */

export interface ChatStreamOptions {
  query: string;
  userId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onChunk: (text: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export async function streamChat(options: ChatStreamOptions): Promise<void> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const res = await fetch(`${apiBase}/api/ai/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: options.query,
      user_id: options.userId,
      history: options.history ?? [],
    }),
    signal: options.signal,
  });

  if (!res.ok || !res.body) {
    options.onError?.(new Error(`AI chat failed: ${res.status}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Split on SSE event delimiter (\n\n).
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const block of events) {
      const lines = block.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (event === 'chunk') {
        options.onChunk(data);
      } else if (event === 'error') {
        options.onError?.(new Error(data));
      } else if (event === 'done') {
        options.onDone?.();
      }
    }
  }
  options.onDone?.();
}
