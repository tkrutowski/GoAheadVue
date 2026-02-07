// composables/useEc2Control.ts
import { ref } from 'vue';

const API_URL = 'https://vxy52veych.execute-api.eu-central-1.amazonaws.com';

export type EnsureInstanceRunningPhase = 'checking' | 'starting' | 'waiting' | 'waiting_app';

export function useEc2Control() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function controlInstance(instanceId: string, action: 'start' | 'stop' | 'status') {
    console.log('controlInstance', instanceId, action);
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_URL}/ec2/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function startInstance(instanceId: string) {
    return controlInstance(instanceId, 'start');
  }

  async function stopInstance(instanceId: string) {
    return controlInstance(instanceId, 'stop');
  }
  async function getInstanceStatus(instanceId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_URL}/ec2/status?instanceId=${encodeURIComponent(instanceId)}&action=status`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function ensureInstanceRunning(
    instanceId: string,
    options?: {
      pollIntervalMs?: number;
      timeoutMs?: number;
      waitForAppTimeoutMs?: number;
      onPhase?: (phase: EnsureInstanceRunningPhase) => void;
      /** Po uruchomieniu EC2 czeka, aż aplikacja odpowie (np. test ping). Gdy brak – kończy po stanie running. */
      waitForAppPing?: () => Promise<void>;
    }
  ): Promise<void> {
    const pollIntervalMs = options?.pollIntervalMs ?? 5000;
    const timeoutMs = options?.timeoutMs ?? 120000;
    const waitForAppTimeoutMs = options?.waitForAppTimeoutMs ?? 60000;
    const onPhase = options?.onPhase;
    const waitForAppPing = options?.waitForAppPing;

    function getState(data: { state?: string; status?: string }): string {
      const raw = data?.state ?? data?.status ?? '';
      return String(raw).toLowerCase();
    }

    onPhase?.('checking');
    let data = await getInstanceStatus(instanceId);
    let state = getState(data);

    if (state !== 'running') {
      onPhase?.('starting');
      await startInstance(instanceId);

      onPhase?.('waiting');
      const startTime = Date.now();

      while (true) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        if (Date.now() - startTime > timeoutMs) {
          throw new Error('Timeout: serwer nie uruchomił się w przewidzianym czasie. Spróbuj za chwilę.');
        }
        data = await getInstanceStatus(instanceId);
        state = getState(data);
        if (state === 'running') {
          break;
        }
      }
    }

    if (waitForAppPing) {
      onPhase?.('waiting_app');
      const appStartTime = Date.now();
      while (true) {
        try {
          await waitForAppPing();
          return;
        } catch {
          if (Date.now() - appStartTime > waitForAppTimeoutMs) {
            throw new Error(
              'Aplikacja nie odpowiada. Serwer EC2 działa – sprawdź połączenie internetowe lub spróbuj za chwilę.'
            );
          }
          await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
      }
    }
  }

  return {
    loading,
    error,
    startInstance,
    stopInstance,
    getInstanceStatus,
    controlInstance,
    ensureInstanceRunning,
  };
}
