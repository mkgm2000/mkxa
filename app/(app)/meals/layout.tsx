import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

export default function MealsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGradientBg mood="happy" className="-mb-28 pb-28">
      {children}
    </MoodGradientBg>
  );
}
