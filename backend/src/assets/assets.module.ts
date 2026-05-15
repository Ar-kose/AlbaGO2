import { BadRequestException, Body, Controller, Get, Module, NotFoundException, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminTokenGuard } from '../common/admin-token.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, basename } from 'node:path';

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const assetRoot = resolve(process.env.ASSET_STORAGE_DIR || process.cwd(), 'uploads', 'assets');

// ASSET_PUBLIC_BASE_URL tanimliysa asset URI'lari public URL olarak dondurulur (VPS production modu)
// Tanimli degilse local dev modu — /v1/assets/:id ile serve edilir
const publicBaseUrl = process.env.ASSET_PUBLIC_BASE_URL?.replace(/\/$/, '') || null;

const allowedMimeTypes: Record<string, { ext: string; format: 'PNG' | 'WEBP' | 'SVG' }> = {
  'image/png': { ext: '.png', format: 'PNG' },
  'image/webp': { ext: '.webp', format: 'WEBP' },
  'image/svg+xml': { ext: '.svg', format: 'SVG' }
};

interface UploadedAssetDto {
  id: string;
  key: string;
  kind: 'IMAGE';
  format: 'PNG' | 'WEBP' | 'SVG';
  uri: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  createdAt: string;
}

// PHP proxy yapilandirmasi — tanimliysa upload'lar PHP sunucuya proxy'lenir
// VPS modunda (ASSET_PUBLIC_BASE_URL tanimli) PHP proxy KULLANILMAZ — direkt local storage
function getPhpProxyConfig(): { serverUrl: string; token: string } | null {
  if (publicBaseUrl) return null; // VPS modunda PHP proxy devre disi
  const serverUrl = process.env.PHP_ASSET_SERVER_URL;
  const token = process.env.PHP_ASSET_TOKEN;
  if (!serverUrl || !token || serverUrl === '' || token === '') {
    return null;
  }
  return { serverUrl: serverUrl.replace(/\/$/, ''), token };
}

@ApiTags('assets')
@Controller('internal/assets')
@UseGuards(AdminTokenGuard)
class InternalAssetsController {
  private readonly assets = new Map<string, UploadedAssetDto>();

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ASSET_BYTES } }))
  async upload(@UploadedFile() file: any, @Body() body: any): Promise<UploadedAssetDto | any> {
    if (!file) {
      throw new BadRequestException('file_required');
    }

    const php = getPhpProxyConfig();
    if (php) {
      return this.proxyUploadToPhp(file, body, php);
    }

    const allowed = allowedMimeTypes[file.mimetype];
    if (!allowed) {
      throw new BadRequestException('unsupported_asset_type');
    }
    if (file.size > MAX_ASSET_BYTES) {
      throw new BadRequestException('asset_too_large');
    }
    if (allowed.format === 'SVG') {
      validateSvg(file.buffer.toString('utf8'));
    }
    if (!existsSync(assetRoot)) {
      mkdirSync(assetRoot, { recursive: true });
    }

    const id = `asset_${randomUUID()}`;
    const safeOriginalName = String(file.originalname ?? 'asset').replace(/[^a-zA-Z0-9._-]/g, '-');
    const key = safeOriginalName.replace(extname(safeOriginalName), '') || id;
    const filename = `${id}${allowed.ext}`;
    const path = join(assetRoot, filename);
    writeFileSync(path, file.buffer);

    // VPS production modunda public HTTPS URL, local dev modunda relative path
    const uri = publicBaseUrl
      ? `${publicBaseUrl}/assets/${filename}`
      : `/v1/assets/${id}`;

    const asset: UploadedAssetDto = {
      id,
      key,
      kind: 'IMAGE',
      format: allowed.format,
      uri,
      mimeType: file.mimetype,
      bytes: file.size,
      sha256: createHash('sha256').update(file.buffer).digest('hex'),
      createdAt: new Date().toISOString()
    };
    this.assets.set(id, asset);
    return asset;
  }

  @Get('list')
  async listAssets(@Query() query: any): Promise<any> {
    const php = getPhpProxyConfig();
    if (php) {
      const params = new URLSearchParams();
      if (query.category) params.set('category', query.category);
      if (query.search) params.set('search', query.search);
      if (query.page) params.set('page', query.page);
      if (query.perPage) params.set('perPage', query.perPage);
      const url = `${php.serverUrl}/api/assets?${params.toString()}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${php.token}` }
      });
      return response.json();
    }

    // Local mod: list assets from disk
    if (!existsSync(assetRoot)) return { items: [], total: 0 };
    const files = readdirSync(assetRoot)
      .filter(f => ['.png', '.webp', '.svg'].some(ext => f.endsWith(ext)))
      .map(f => {
        const filePath = join(assetRoot, f);
        const stat = statSync(filePath);
        return {
          id: basename(f, extname(f)),
          key: basename(f, extname(f)),
          uri: publicBaseUrl
            ? `${publicBaseUrl}/assets/${f}`
            : `/v1/assets/${basename(f, extname(f))}`,
          bytes: stat.size,
          createdAt: stat.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (query.search) {
      const s = String(query.search).toLowerCase();
      return { items: files.filter(f => f.id.toLowerCase().includes(s)), total: files.length };
    }
    return { items: files, total: files.length };
  }

  @Post(':id/archive')
  async archiveAsset(@Param('id') id: string): Promise<any> {
    const php = getPhpProxyConfig();
    if (php) {
      const url = `${php.serverUrl}/api/assets/${encodeURIComponent(id)}/archive`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${php.token}` }
      });
      return response.json();
    }

    // Local mod: delete file from disk
    const candidates = ['.png', '.webp', '.svg'].map(ext => join(assetRoot, `${id}${ext}`));
    const path = candidates.find(c => existsSync(c));
    if (!path) throw new NotFoundException('asset_not_found');
    unlinkSync(path);
    this.assets.delete(id);
    return { archived: true, id };
  }

  private async proxyUploadToPhp(file: any, body: any, php: { serverUrl: string; token: string }): Promise<any> {
    const category = (body?.category && typeof body.category === 'string') ? body.category : 'covers';
    const formData = new FormData();
    formData.append('file', new Blob([file.buffer], { type: file.mimetype ?? 'application/octet-stream' }), file.originalname ?? 'asset');
    formData.append('category', category);

    const response = await fetch(`${php.serverUrl}/api/assets/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${php.token}` },
      body: formData
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let parsed: any;
      try { parsed = JSON.parse(errorBody); } catch { parsed = { error: 'proxy_error', detail: errorBody }; }
      throw new BadRequestException(parsed.error ?? 'proxy_error');
    }

    return response.json();
  }
}

@ApiTags('assets')
@Controller('assets')
class PublicAssetsController {
  @Get(':assetId')
  getAsset(@Param('assetId') assetId: string, @Res() res: any) {
    const candidates = ['.png', '.webp', '.svg'].map((extension) => join(assetRoot, `${assetId}${extension}`));
    const path = candidates.find((candidate) => existsSync(candidate));
    if (!path) {
      throw new NotFoundException('asset_not_found');
    }
    const extension = extname(path);
    const mimeType = extension === '.svg' ? 'image/svg+xml' : extension === '.webp' ? 'image/webp' : 'image/png';
    res.setHeader('Content-Type', mimeType);
    res.send(readFileSync(path));
  }
}

@Module({
  controllers: [InternalAssetsController, PublicAssetsController]
})
export class AssetsModule {}

function validateSvg(svg: string) {
  const lower = svg.toLowerCase();
  const forbiddenPatterns = ['<script', 'onload=', 'onclick=', 'onerror=', 'javascript:', '<foreignobject'];
  if (forbiddenPatterns.some((pattern) => lower.includes(pattern))) {
    throw new BadRequestException('unsafe_svg');
  }
}
