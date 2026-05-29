import { MoodGradientBg } from '@/components/mood/MoodGradientBg';

export default function MealsLayout({ children }: { children: React.ReactNode }) {
  return <MoodGradientBg mood="happy">{children}</MoodGradientBg>;
}
