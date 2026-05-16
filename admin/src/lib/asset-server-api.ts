export interface AssetDto {
  id: string;
  key: string;
  kind: 'IMAGE' | 'AUDIO';
  format: string;
  category?: string;
  uri: string;
  url: string;   // alias for backward compat
  filename?: string;  // alias for backward compat
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  sha256: string;
  version?: number;
  archived?: boolean;
  createdAt: string;
}

export interface AssetListResponse {
  items: AssetDto[];
  total: number;
  page: number;
  perPage: number;
}

export interface StandardDimension {
  w: number; h: number; label: string;
}

// Asset islemleri icin ayri API URL. VPS'e yonlendirerek albago.tr uzerinden erisim saglar.
// Ayarlanmazsa ana API URL'si kullanilir.
const assetApiBaseUrl = (process.env.NEXT_PUBLIC_ASSET_API_URL ?? process.env.NEXT_PUBLIC_ALBAGO_API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

const apiBaseUrl = (process.env.NEXT_PUBLIC_ALBAGO_API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(`${assetApiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.error) {
    const messages = Array.isArray(payload.message) ? payload.message
      : Array.isArray(payload.errors) ? payload.errors : [];
    const details = messages.length > 0 ? `: ${messages.join(', ')}` : '';
    throw new Error(`${payload.error ?? payload.message ?? response.statusText}${details}`);
  }
  return payload as T;
}

// Normalize backend response to AssetDto
function normalizeAsset(raw: any): AssetDto {
  const rawUri: string = raw.uri ?? raw.url ?? '';
  // Convert relative URIs to absolute (backend on :3001, admin on :3000)
  const absoluteUri = rawUri.startsWith('/v1/') ? `${assetApiBaseUrl}${rawUri.replace('/v1', '')}` : rawUri;
  return {
    id: raw.id,
    key: raw.key ?? raw.id,
    kind: raw.kind ?? 'IMAGE',
    format: raw.format ?? 'PNG',
    category: raw.category ?? undefined,
    uri: absoluteUri,
    url: absoluteUri,
    filename: raw.filename ?? raw.key ?? raw.id,
    mimeType: raw.mimeType ?? 'application/octet-stream',
    bytes: raw.bytes ?? 0,
    width: raw.width ?? undefined,
    height: raw.height ?? undefined,
    durationSec: raw.durationSec ?? undefined,
    sha256: raw.sha256 ?? '',
    version: raw.version ?? 1,
    archived: raw.archived ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export async function listAssets(
  params?: { category?: string; kind?: string; search?: string; page?: number; perPage?: number }
): Promise<AssetListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.kind) searchParams.set('kind', params.kind);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.perPage) searchParams.set('perPage', String(params.perPage));
  const qs = searchParams.toString();
  const result = await request<any>(`/internal/assets/list${qs ? `?${qs}` : ''}`);
  return { ...result, items: (result.items ?? []).map(normalizeAsset) };
}

export async function getStandardDimensions(): Promise<Record<string, StandardDimension>> {
  const result = await request<any>('/internal/assets/standards');
  return result.dimensions ?? {};
}

export async function uploadAsset(file: File, category: string): Promise<AssetDto> {
  const form = new FormData();
  form.append('file', file);
  form.append('category', category);
  return request<AssetDto>('/internal/assets', {
    method: 'POST',
    body: form
  });
}

export async function archiveAsset(id: string): Promise<{ archived: boolean; id: string }> {
  return request<{ archived: boolean; id: string }>(`/internal/assets/${encodeURIComponent(id)}/archive`, {
    method: 'POST'
  });
}
