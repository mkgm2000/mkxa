import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

// Training keeps a fixed joyful-green backdrop so the tab has its own
// identity like Comidas (happy yellow) and Gastos. The home + profile
// tabs continue to follow the current mood.
export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGradientBg mood="joyful" className="-mb-28 pb-28">
      {children}
    </MoodGradientBg>
  );
}
