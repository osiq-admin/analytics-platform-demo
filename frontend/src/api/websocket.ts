type MessageHandler = (data: unknown) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;

  constructor(path: string) {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${proto}//${location.host}${path}`;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (e) => {
      try {
        const data: unknown = JSON.parse(e.data as string);
        this.handlers.forEach((h) => h(data));
      } catch {
        /* ignore non-JSON */
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

export const pipelineWs = new WsClient("/ws/pipeline");
