import { BadRequestException, Body, Controller, Get, Module, NotFoundException, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminTokenGuard } from '../common/admin-token.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, basename } from 'node:path';

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const assetRoot = resolve(process.env.ASSET_STORAGE_DIR || process.cwd(), 'uploads', 'assets');
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

@ApiTags('assets')
@Controller('internal/assets')
@UseGuards(AdminTokenGuard)
class InternalAssetsController {
  private readonly assets = new Map<string, UploadedAssetDto>();

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ASSET_BYTES } }))
  async upload(@UploadedFile() file: any): Promise<UploadedAssetDto> {
    if (!file) throw new BadRequestException('file_required');

    const allowed = allowedMimeTypes[file.mimetype];
    if (!allowed) throw new BadRequestException('unsupported_asset_type');
    if (file.size > MAX_ASSET_BYTES) throw new BadRequestException('asset_too_large');
    if (allowed.format === 'SVG') validateSvg(file.buffer.toString('utf8'));
    if (!existsSync(assetRoot)) mkdirSync(assetRoot, { recursive: true });

    const id = `asset_${randomUUID()}`;
    const safeOriginalName = String(file.originalname ?? 'asset').replace(/[^a-zA-Z0-9._-]/g, '-');
    const key = safeOriginalName.replace(extname(safeOriginalName), '') || id;
    const filename = `${id}${allowed.ext}`;
    writeFileSync(join(assetRoot, filename), file.buffer);

    const uri = publicBaseUrl
      ? `${publicBaseUrl}/assets/${filename}`
      : `/v1/assets/${id}`;

    const asset: UploadedAssetDto = {
      id, key, kind: 'IMAGE', format: allowed.format, uri,
      mimeType: file.mimetype, bytes: file.size,
      sha256: createHash('sha256').update(file.buffer).digest('hex'),
      createdAt: new Date().toISOString()
    };
    this.assets.set(id, asset);
    return asset;
  }

  @Get('list')
  async listAssets(@Query() query: any): Promise<any> {
    if (!existsSync(assetRoot)) return { items: [], total: 0 };

    const files = readdirSync(assetRoot)
      .filter(f => ['.png', '.webp', '.svg'].some(ext => f.endsWith(ext)))
      .map(f => {
        const filePath = join(assetRoot, f);
        const stat = statSync(filePath);
        const id = basename(f, extname(f));
        return {
          id, key: id,
          uri: publicBaseUrl ? `${publicBaseUrl}/assets/${f}` : `/v1/assets/${id}`,
          bytes: stat.size, createdAt: stat.birthtime.toISOString()
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
    const candidates = ['.png', '.webp', '.svg'].map(ext => join(assetRoot, `${id}${ext}`));
    const path = candidates.find(c => existsSync(c));
    if (!path) throw new NotFoundException('asset_not_found');
    unlinkSync(path);
    this.assets.delete(id);
    return { archived: true, id };
  }
}

@ApiTags('assets')
@Controller('assets')
class PublicAssetsController {
  @Get(':assetId')
  getAsset(@Param('assetId') assetId: string, @Res() res: any) {
    const candidates = ['.png', '.webp', '.svg'].map(ext => join(assetRoot, `${assetId}${ext}`));
    const path = candidates.find(c => existsSync(c));
    if (!path) throw new NotFoundException('asset_not_found');
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
  if (forbiddenPatterns.some(pattern => lower.includes(pattern))) {
    throw new BadRequestException('unsafe_svg');
  }
}
