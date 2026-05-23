import { NextRequest, NextResponse } from 'next/server';
import { readMapData, writeMapData } from '@/lib/data';

export async function GET() {
  try {
    const data = readMapData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to read map data:', error);
    return NextResponse.json(
      { error: 'Failed to read map data' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.grid || !Array.isArray(body.grid)) {
      return NextResponse.json(
        { error: 'Invalid map data format' },
        { status: 400 },
      );
    }
    writeMapData(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write map data:', error);
    return NextResponse.json(
      { error: 'Failed to write map data' },
      { status: 500 },
    );
  }
}
