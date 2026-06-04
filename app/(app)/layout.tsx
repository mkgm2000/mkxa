import { MoodGate } from '@/components/mood/MoodGate';
import { BottomNav } from '@/components/nav/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGate>
      <div className="min-h-dvh pb-36">{children}</div>
      <BottomNav />
    </MoodGate>
  );
}
