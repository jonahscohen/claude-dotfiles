import { Transport } from './transport';
import { Overlay } from './overlay';
import { Toolbar } from './toolbar';
import { AdapterRegistry } from './adapter-registry';
import type { ImprovAdapter, ImprovMode } from './types';

declare global {
  interface Window {
    __improv: ImprovCore;
  }
}

export class ImprovCore {
  private transport: Transport;
  private overlay: Overlay;
  private registry: AdapterRegistry;
  private toolbar: Toolbar | null = null;
  private active = false;
  private currentMode: ImprovMode | null = null;

  constructor() {
    this.transport = new Transport();
    this.overlay = new Overlay();
    this.registry = new AdapterRegistry();
  }

  async init(): Promise<void> {
    // Register server-push handlers
    this.transport.on('activate', () => this.activate());
    this.transport.on('deactivate', () => this.deactivate());

    // Keyboard shortcut: Cmd+Shift+I (Mac) / Ctrl+Shift+I (Win/Linux)
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        if (this.active) {
          this.deactivate();
        } else {
          this.activate();
        }
      }
    });

    try {
      await this.transport.connect();
    } catch {
      // Connection failure is non-fatal; reconnect will be attempted automatically
    }
  }

  activate(): void {
    if (this.active) return;
    this.active = true;

    this.overlay.mount();

    this.toolbar = new Toolbar(this.overlay.getShadowRoot());
    this.toolbar.setConnected(this.transport.isConnected());
    this.toolbar.onMode((mode) => this.switchMode(mode));

    // Keep connected status in sync
    const onDisconnected = () => this.toolbar?.setConnected(false);
    const onConnected = () => this.toolbar?.setConnected(true);
    this.transport.on('disconnected', onDisconnected);
    this.transport.on('connected', onConnected);
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;

    this.switchMode(null);
    this.toolbar?.destroy();
    this.toolbar = null;
    this.overlay.unmount();
  }

  switchMode(mode: ImprovMode | null): void {
    this.currentMode = mode;
    // Mode controllers will be wired in Task 27
  }

  registerAdapter(adapter: ImprovAdapter): void {
    this.registry.register(adapter);
  }

  isActive(): boolean {
    return this.active;
  }

  getTransport(): Transport {
    return this.transport;
  }

  getOverlay(): Overlay {
    return this.overlay;
  }

  getAdapters(): AdapterRegistry {
    return this.registry;
  }
}

const improv = new ImprovCore();
window.__improv = improv;
improv.init().catch(() => {
  // Silent fail - transport will retry
});

export default improv;
