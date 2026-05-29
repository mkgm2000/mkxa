'use client';

import { MoodGradientBg } from '@/components/mood/MoodGradientBg';
import { MKXALogo } from '@/components/branding/MKXALogo';
import { AvatarTile } from '@/components/profile/AvatarTile';
import { InlineSaveText } from '@/components/feedback/InlineSaveText';

export default function PickPage() {
  return (
    <MoodGradientBg mood="neutral">
      <main
        className="flex min-h-dvh w-full flex-col items-center justify-center gap-8 px-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }}
      >
        <MKXALogo size={80} />

        <h1 className="text-center font-sans text-[28px] font-extrabold tracking-tightest text-ink">
          ¿Quién entra?
        </h1>

        <div className="flex w-full flex-col items-center gap-3">
          <AvatarTile athlete="MK" />
          <AvatarTile athlete="Xabi" />
        </div>

        <InlineSaveText />
      </main>
    </MoodGradientBg>
  );
}
