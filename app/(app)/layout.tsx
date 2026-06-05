import { MoodGate } from '@/components/mood/MoodGate';
import { HyroxGate } from '@/components/branding/HyroxGate';
import { BottomNav } from '@/components/nav/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGate>
      <HyroxGate>
        <div className="min-h-dvh pb-36">{children}</div>
        <BottomNav />
      </HyroxGate>
    </MoodGate>
  );
}
