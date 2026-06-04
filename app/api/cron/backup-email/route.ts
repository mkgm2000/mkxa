import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildWorkbookBuffer, todayStamp } from '@/lib/export/build-workbook';

// Weekly backup email cron.
//
// Triggered by Vercel Cron (see `vercel.json`) every Sunday at 21:00 UTC
// (= 22:00 Madrid in winter, 23:00 in summer — fine for v1).
//
// Required env vars (set manually in Vercel, do NOT commit secrets):
//   - RESEND_API_KEY: Resend API key. Free tier covers 3000 emails/mo,
//     more than enough for one weekly backup.
//   - CRON_SECRET (optional but recommended): Vercel injects this as
//     `Authorization: Bearer <CRON_SECRET>` on cron invocations. When set,
//     we reject any request without a matching bearer token.
//
// When called manually in dev (no CRON_SECRET set), any caller is allowed
// so you can hit it with:
//   curl http://localhost:3000/api/cron/backup-email
//
// The route is deliberately tolerant: if RESEND_API_KEY is missing it
// returns 200 with a note so cron logs stay green instead of paging.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TO_ADDRESS = 'xabier.ariznabarreta@gmail.com';
// Resend's sandbox sender — works without domain verification. Switch to
// a verified domain (e.g. `backup@mkxa.app`) once the user has one.
const FROM_ADDRESS = 'mkxa <onboarding@resend.dev>';

export async function GET(req: NextRequest) {
  // --- 1. Cron auth ---------------------------------------------------------
  const cronSecret = (process.env.CRON_SECRET ?? '').trim();
  if (cronSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  // --- 2. Resend config check ----------------------------------------------
  const resendKey = (process.env.RESEND_API_KEY ?? '').trim();
  if (!resendKey) {
    // Keep cron logs green: respond 200 with a clear note so the next
    // invocation does not show as a failure in Vercel's dashboard.
    return NextResponse.json(
      {
        ok: false,
        skipped: true,
        reason: 'RESEND_API_KEY not configured',
      },
      { status: 200 },
    );
  }

  // --- 3. Build workbook ----------------------------------------------------
  let buffer: Buffer;
  try {
    const arrayBuffer = await buildWorkbookBuffer();
    // Resend's attachment API wants a Node Buffer (or base64 string).
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[cron/backup-email] workbook build failed:', message);
    return NextResponse.json({ ok: false, error: 'workbook_build_failed', message }, { status: 500 });
  }

  const stamp = todayStamp();
  const filename = `mkxa-backup-${stamp}.xlsx`;

  // --- 4. Send via Resend ---------------------------------------------------
  const resend = new Resend(resendKey);
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Backup semanal mkxa</h2>
      <p style="margin: 0 0 12px;">Fecha: <strong>${stamp}</strong></p>
      <p style="margin: 0 0 12px;">Adjunto va el <code>.xlsx</code> con todos tus datos (restaurantes, recetas, pelis/series, gastos, despensa, compra, mood, training, pases y colecciones).</p>
      <p style="margin: 0 0 12px;">Si quieres descargarlo manualmente en cualquier momento: <a href="https://mkxa.vercel.app/profile">mkxa.vercel.app/profile</a>.</p>
      <p style="margin: 24px 0 0; color: #666; font-size: 12px;">— enviado automáticamente por el cron de mkxa</p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: TO_ADDRESS,
      subject: `Backup mkxa — ${stamp}`,
      html,
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    });

    if (error) {
      console.error('[cron/backup-email] Resend error:', error);
      return NextResponse.json({ ok: false, error: 'resend_failed', detail: error }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[cron/backup-email] Resend exception:', message);
    return NextResponse.json({ ok: false, error: 'resend_exception', message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentTo: TO_ADDRESS, filename, bytes: buffer.length });
}
