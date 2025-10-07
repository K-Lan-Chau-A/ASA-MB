import { HubConnectionBuilder, HubConnection, HubConnectionState, LogLevel } from '@microsoft/signalr';
import API_URL from '../config/api';

export type SignalRNotification = any; // shape may vary; handled by screen mapping

type Listener = (payload: SignalRNotification) => void;

class SignalRService {
  private connection: HubConnection | null = null;
  private currentShopId: number | null = null;
  private notificationListeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  private emit(payload: SignalRNotification) {
    for (const l of Array.from(this.notificationListeners)) {
      try { l(payload); } catch {}
    }
  }

  async connect(shopId: number): Promise<void> {
    if (!(shopId > 0)) return;
    this.currentShopId = shopId;

    // If already connected to same shop, skip
    if (this.connection && this.connection.state === HubConnectionState.Connected) return;

    // Clean old connection
    if (this.connection) {
      try { await this.connection.stop(); } catch {}
      this.connection = null;
    }

    const hubUrl = `${API_URL.replace(/\/$/, '')}/notificationHub`;
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: true,
        transport: 1, // WebSockets
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    // Events from BE (based on index.html reference)
    connection.on('LowStockAlert', (payload) => {
      try { console.log('[SignalR] LowStockAlert', payload); } catch {}
      this.emit({ type: 'LowStockAlert', payload });
    });
    connection.on('ReceiveNotification', (packet) => {
      try { console.log('[SignalR] ReceiveNotification', packet); } catch {}
      this.emit({ type: 'ReceiveNotification', payload: packet });
    });

    connection.onreconnected(async () => {
      if (this.currentShopId) {
        try { await connection.invoke('JoinShopGroup', Number(this.currentShopId)); } catch {}
      }
    });

    await connection.start();
    try { console.log('[SignalR] connected to', hubUrl); } catch {}
    await connection.invoke('JoinShopGroup', Number(shopId));
    try { console.log('[SignalR] joined group Shop_' + shopId); } catch {}

    this.connection = connection;
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    try { await this.connection.stop(); } finally { this.connection = null; }
  }
}

export const signalRService = new SignalRService();


