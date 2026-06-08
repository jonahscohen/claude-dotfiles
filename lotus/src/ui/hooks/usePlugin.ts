import { useState, useEffect, useCallback, useRef } from 'react';
import type { PluginToUIMessage } from '../../plugin/types';
import { postToPlugin, requestFromPlugin, saveSetting, loadSetting } from '../lib/figma-bridge';

export interface PluginBridge {
  ready: boolean;
  request: <T = unknown>(builder: (requestId: string) => any) => Promise<T>;
  send: (msg: any) => void;
  saveSetting: (key: string, value: string) => Promise<boolean>;
  loadSetting: (key: string) => Promise<string | null>;
  subscribe: (handler: (msg: PluginToUIMessage) => void) => () => void;
}

export function usePlugin(): PluginBridge {
  const [ready, setReady] = useState(false);
  const listenersRef = useRef<Set<(msg: PluginToUIMessage) => void>>(new Set());

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as PluginToUIMessage | undefined;
      if (!msg) return;

      if (msg.type === 'plugin-ready') {
        setReady(true);
      }

      for (const listener of listenersRef.current) {
        listener(msg);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const subscribe = useCallback((handler: (msg: PluginToUIMessage) => void) => {
    listenersRef.current.add(handler);
    return () => { listenersRef.current.delete(handler); };
  }, []);

  return {
    ready,
    request: requestFromPlugin,
    send: postToPlugin,
    saveSetting,
    loadSetting,
    subscribe,
  };
}
