export interface PackageValidationResult {
  valid: boolean;
  errors: Array<{ code: string; field: string; message: string }>;
  warnings: Array<{ code: string; field: string; message: string }>;
  summary?: {
    title: string;
    template: string;
    category: string;
    orientation: string;
    durationSec: number;
  };
  runtimeCompatibility?: {
    templateSupported: boolean;
    motionsSupported: boolean;
    rulesSupported: boolean;
    unsupportedItems: string[];
  };
}

export interface PackageImportResult {
  imported: boolean;
  gameDefinitionId?: string;
  status?: string;
  redirectTo?: string;
  validation?: PackageValidationResult;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_ALBAGO_API_URL ?? 'http://localhost:3000/v1').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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

export async function validateGamePackage(pkg: unknown): Promise<PackageValidationResult> {
  return request<PackageValidationResult>('/internal/game-packages/validate', {
    method: 'POST',
    body: JSON.stringify({ package: pkg })
  });
}

export async function importGamePackage(pkg: unknown): Promise<PackageImportResult> {
  return request<PackageImportResult>('/internal/game-packages/import', {
    method: 'POST',
    body: JSON.stringify({ package: pkg, createMode: 'DRAFT' })
  });
}
