// Generic SSE stream parser for reading Server-Sent Events from a ReadableStream.

export interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete events (separated by double newline)
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        const event: SSEEvent = { data: '' };
        const lines = eventBlock.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            event.data += (event.data ? '\n' : '') + line.slice(6);
          } else if (line.startsWith('event: ')) {
            event.event = line.slice(7);
          } else if (line.startsWith('id: ')) {
            event.id = line.slice(4);
          } else if (line.startsWith('retry: ')) {
            event.retry = parseInt(line.slice(7), 10);
          }
        }

        if (event.data) {
          yield event;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
