import { NextRequest, NextResponse } from 'next/server';
import { scanProject, getTypeCounts } from '@/app/lib/scanner';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customPath = searchParams.get('path');

    // Use custom path if provided, otherwise fallback to env
    const projectPath = customPath || process.env.target_project;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'No project path configured. Set target_project in .env or enter a path above.' },
        { status: 500 }
      );
    }

    const assets = scanProject(projectPath);
    const typeCounts = getTypeCounts(assets);

    return NextResponse.json({
      assets,
      totalCount: assets.length,
      typeCounts,
      scannedPath: projectPath,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
