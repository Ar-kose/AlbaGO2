export interface AssetDto {
  id: string;
  filename: string;
  url: string;
  category: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  width: number;
  height: number;
  version: number;
  archived: boolean;
  createdAt: string;
}

export interface AssetListResponse {
  items: AssetDto[];
  total: number;
  page: number;
  perPage: number;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_ALBAGO_API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.error) {
    const details = Array.isArray(payload.errors) ? `: ${payload.errors.join(', ')}` : '';
    throw new Error(`${payload.error ?? response.statusText}${details}`);
  }
  return payload as T;
}

export async function listAssets(
  params?: { category?: string; search?: string; page?: number; perPage?: number }
): Promise<AssetListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.perPage) searchParams.set('perPage', String(params.perPage));
  const qs = searchParams.toString();
  return request<AssetListResponse>(`/internal/assets/list${qs ? `?${qs}` : ''}`);
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
