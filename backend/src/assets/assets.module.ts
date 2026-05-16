import { BadRequestException, Body, Controller, Get, Module, NotFoundException, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminTokenGuard } from '../common/admin-token.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, basename } from 'node:path';
import { PrismaService } from '../persistence/prisma.service';

const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const assetRoot = resolve(process.env.ASSET_STORAGE_DIR || process.cwd(), 'uploads', 'assets');
const publicBaseUrl = process.env.ASSET_PUBLIC_BASE_URL?.replace(/\/$/, '') || null;

const allowedMimeTypes: Record<string, { ext: string; kind: 'IMAGE' | 'AUDIO'; format: string }> = {
  'image/png': { ext: '.png', kind: 'IMAGE', format: 'PNG' },
  'image/webp': { ext: '.webp', kind: 'IMAGE', format: 'WEBP' },
  'image/svg+xml': { ext: '.svg', kind: 'IMAGE', format: 'SVG' },
  'audio/mpeg': { ext: '.mp3', kind: 'AUDIO', format: 'MP3' },
  'audio/wav': { ext: '.wav', kind: 'AUDIO', format: 'WAV' },
  'audio/wave': { ext: '.wav', kind: 'AUDIO', format: 'WAV' },
  'audio/ogg': { ext: '.ogg', kind: 'AUDIO', format: 'OGG' },
  'audio/mp3': { ext: '.mp3', kind: 'AUDIO', format: 'MP3' },
};

const STANDARD_DIMENSIONS: Record<string, { width: number; height: number; label: string }> = {
  cover: { width: 512, height: 512, label: '512x512 px' },
  background: { width: 1920, height: 1080, label: '1920x1080 px' },
  character: { width: 512, height: 512, label: '512x512 px' },
  target: { width: 256, height: 256, label: '256x256 px' },
  icon: { width: 128, height: 128, label: '128x128 px' },
};

interface UploadedAssetDto {
  id: string;
  key: string;
  kind: 'IMAGE' | 'AUDIO';
  format: string;
  category?: string;
  uri: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  sha256: string;
  createdAt: string;
}

@ApiTags('assets')
@Controller('internal/assets')
@UseGuards(AdminTokenGuard)
class InternalAssetsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ASSET_BYTES } }))
  async upload(@UploadedFile() file: any, @Body('category') category?: string): Promise<UploadedAssetDto> {
    if (!file) throw new BadRequestException('file_required');

    const allowed = allowedMimeTypes[file.mimetype];
    if (!allowed) throw new BadRequestException(`Desteklenmeyen dosya turu: ${file.mimetype}. Desteklenen: PNG, WebP, SVG, MP3, WAV, OGG.`);
    if (file.size > MAX_ASSET_BYTES) throw new BadRequestException('Dosya 5MB sinirini asiyor.');
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

    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    // Store metadata in Prisma
    if (this.prisma.client) {
      await this.prisma.client.asset.create({
        data: {
          id, key, kind: allowed.kind, format: allowed.format,
          category: category || null,
          uri, filename, mimeType: file.mimetype, bytes: file.size,
          sha256
        }
      });
    }

    return {
      id, key, kind: allowed.kind, format: allowed.format,
      category: category || undefined,
      uri, mimeType: file.mimetype, bytes: file.size,
      sha256, createdAt: new Date().toISOString()
    };
  }

  @Get('list')
  async listAssets(
    @Query('category') category?: string,
    @Query('kind') kind?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string
  ): Promise<any> {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage ?? '24', 10) || 24));

    if (this.prisma.client) {
      const where: any = { archived: false };
      if (category && category !== 'all') where.category = category;
      if (kind && kind !== 'all') where.kind = kind;
      if (search) where.key = { contains: search, mode: 'insensitive' };

      const [items, total] = await Promise.all([
        this.prisma.client.asset.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (pageNum - 1) * perPageNum,
          take: perPageNum
        }),
        this.prisma.client.asset.count({ where })
      ]);

      return {
        items: items.map(mapPrismaAsset),
        total,
        page: pageNum,
        perPage: perPageNum
      };
    }

    // Fallback: filesystem-only listing (dev without Prisma)
    if (!existsSync(assetRoot)) return { items: [], total: 0, page: pageNum, perPage: perPageNum };

    const files = readdirSync(assetRoot)
      .filter(f => ['.png', '.webp', '.svg', '.mp3', '.wav', '.ogg'].some(ext => f.endsWith(ext)))
      .map(f => {
        const filePath = join(assetRoot, f);
        const stat = statSync(filePath);
        const assetId = basename(f, extname(f));
        return {
          id: assetId, key: assetId,
          kind: ['.mp3', '.wav', '.ogg'].some(e => f.endsWith(e)) ? 'AUDIO' : 'IMAGE',
          format: f.endsWith('.png') ? 'PNG' : f.endsWith('.webp') ? 'WEBP' : f.endsWith('.svg') ? 'SVG' : f.endsWith('.mp3') ? 'MP3' : f.endsWith('.wav') ? 'WAV' : 'OGG',
          uri: publicBaseUrl ? `${publicBaseUrl}/assets/${f}` : `/v1/assets/${assetId}`,
          bytes: stat.size, createdAt: stat.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (search) {
      const s = String(search).toLowerCase();
      return { items: files.filter(f => f.id.toLowerCase().includes(s)), total: files.length, page: pageNum, perPage: perPageNum };
    }
    return { items: files, total: files.length, page: pageNum, perPage: perPageNum };
  }

  @Get('standards')
  standardDimensions() {
    return { dimensions: STANDARD_DIMENSIONS };
  }

  @Post(':id/archive')
  async archiveAsset(@Param('id') id: string): Promise<any> {
    if (this.prisma.client) {
      const asset = await this.prisma.client.asset.findUnique({ where: { id } });
      if (!asset) throw new NotFoundException('asset_not_found');
      await this.prisma.client.asset.update({
        where: { id },
        data: { archived: true }
      });
      return { archived: true, id };
    }

    // Fallback: filesystem-only archive
    const candidates = ['.png', '.webp', '.svg', '.mp3', '.wav', '.ogg'].map(ext => join(assetRoot, `${id}${ext}`));
    const path = candidates.find(c => existsSync(c));
    if (!path) throw new NotFoundException('asset_not_found');
    unlinkSync(path);
    return { archived: true, id };
  }
}

@ApiTags('assets')
@Controller('assets')
class PublicAssetsController {
  @Get(':assetId')
  getAsset(@Param('assetId') assetId: string, @Res() res: any) {
    const candidates = ['.png', '.webp', '.svg', '.mp3', '.wav', '.ogg'].map(ext => join(assetRoot, `${assetId}${ext}`));
    const path = candidates.find(c => existsSync(c));
    if (!path) throw new NotFoundException('asset_not_found');
    const extension = extname(path);
    const mimeMap: Record<string, string> = {
      '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg'
    };
    res.setHeader('Content-Type', mimeMap[extension] || 'application/octet-stream');
    res.send(readFileSync(path));
  }
}

@Module({
  controllers: [InternalAssetsController, PublicAssetsController]
})
export class AssetsModule {}

function extFromFormat(format: string): string {
  switch (format) {
    case 'PNG': return '.png';
    case 'WEBP': return '.webp';
    case 'SVG': return '.svg';
    case 'MP3': return '.mp3';
    case 'WAV': return '.wav';
    case 'OGG': return '.ogg';
    default: return '.png';
  }
}

function validateSvg(svg: string) {
  const lower = svg.toLowerCase();
  const forbiddenPatterns = ['<script', 'onload=', 'onclick=', 'onerror=', 'javascript:', '<foreignobject'];
  if (forbiddenPatterns.some(pattern => lower.includes(pattern))) {
    throw new BadRequestException('Guvenli olmayan SVG.');
  }
}

function mapPrismaAsset(a: any): UploadedAssetDto {
  // Convert relative URIs to absolute when publicBaseUrl is configured
  let uri: string = a.uri ?? '';
  if (publicBaseUrl && uri.startsWith('/v1/assets/')) {
    const assetId = uri.replace('/v1/assets/', '');
    const ext = extFromFormat(a.format ?? 'PNG');
    uri = `${publicBaseUrl}/assets/${assetId}${ext}`;
  }
  return {
    id: a.id,
    key: a.key,
    kind: a.kind as 'IMAGE' | 'AUDIO',
    format: a.format,
    category: a.category ?? undefined,
    uri,
    mimeType: a.mimeType,
    bytes: a.bytes,
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    durationSec: a.durationSec ?? undefined,
    sha256: a.sha256 ?? '',
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt)
  };
}
