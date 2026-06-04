import { NextResponse } from 'next/server';
import { buildWorkbookBuffer, todayStamp } from '@/lib/export/build-workbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const buffer = await buildWorkbookBuffer();
  const filename = `mkxa-export-${todayStamp()}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
