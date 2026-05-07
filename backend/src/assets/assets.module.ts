import { BadRequestException, Controller, Get, Module, NotFoundException, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const assetRoot = resolve(process.cwd(), 'uploads', 'assets');

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
class InternalAssetsController {
  private readonly assets = new Map<string, UploadedAssetDto>();

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ASSET_BYTES } }))
  upload(@UploadedFile() file: any): UploadedAssetDto {
    if (!file) {
      throw new BadRequestException('file_required');
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
    const path = join(assetRoot, `${id}${allowed.ext}`);
    writeFileSync(path, file.buffer);

    const asset: UploadedAssetDto = {
      id,
      key,
      kind: 'IMAGE',
      format: allowed.format,
      uri: `/v1/assets/${id}`,
      mimeType: file.mimetype,
      bytes: file.size,
      sha256: createHash('sha256').update(file.buffer).digest('hex'),
      createdAt: new Date().toISOString()
    };
    this.assets.set(id, asset);
    return asset;
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
