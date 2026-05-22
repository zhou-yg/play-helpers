import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const THUMBNAIL_SIZE = 256;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');
  const type = searchParams.get('type');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    const decodedPath = decodeURIComponent(filePath);

    if (!fs.existsSync(decodedPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // For images, generate thumbnail with sharp
    if (type === 'image') {
      const extension = path.extname(decodedPath).slice(1).toLowerCase();

      // SVG doesn't work well with sharp, return as-is
      if (extension === 'svg') {
        const svgBuffer = fs.readFileSync(decodedPath);
        return new NextResponse(svgBuffer, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      }

      const thumbnailBuffer = await sharp(decodedPath)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat('webp', { quality: 80 })
        .toBuffer();

      return new NextResponse(new Uint8Array(thumbnailBuffer), {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // For non-image types, return placeholder based on type
    const placeholders: Record<string, string> = {
      video: '🎬',
      audio: '🎵',
      model3d: '🎮',
      gdscript: '📜',
      tscn: '🎭',
    };

    const emoji = placeholders[type || ''] || '📄';

    // Generate a simple colored placeholder with emoji
    const svg = `
      <svg width="${THUMBNAIL_SIZE}" height="${THUMBNAIL_SIZE}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#2a2a2a"/>
        <text x="50%" y="50%" font-size="80" text-anchor="middle" dy=".35em" fill="#888">${emoji}</text>
      </svg>
    `;

    const buffer = Buffer.from(svg);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}
