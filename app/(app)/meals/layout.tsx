import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

export default function MealsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MoodGradientBg mood="happy" className="-mb-36 pb-36">
      {children}
    </MoodGradientBg>
  );
}
