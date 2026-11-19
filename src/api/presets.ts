import { ModifierType, PayloadType, TowerPreset, TriggerType } from '../sim/types';

export async function fetchTowerPresets(): Promise<TowerPreset[]> {
  const res = await fetch('/api/presets', { cache: 'no-store' });
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || `Failed to load presets (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { presets?: TowerPreset[] };
  return Array.isArray(data.presets) ? data.presets : [];
}

export async function createTowerPreset(input: {
  name: string;
  trigger: TriggerType;
  payload: PayloadType;
  modifier: ModifierType;
}): Promise<TowerPreset> {
  const res = await fetch('/api/presets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || `Failed to save preset (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { preset: TowerPreset };
  return data.preset;
}

export async function deleteTowerPreset(id: string): Promise<void> {
  const res = await fetch(`/api/presets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || `Failed to delete preset (HTTP ${res.status})`);
  }
}
