import { auth } from '@/lib/auth';
import { isPremiumUser } from '@/lib/subscription';

type AdSlotSize = 'banner' | 'sidebar' | 'inline';

interface AdSlotProps {
  size?: AdSlotSize;
  className?: string;
}

const sizeStyles: Record<AdSlotSize, string> = {
  banner: 'h-24 w-full',
  sidebar: 'h-64 w-full',
  inline: 'h-20 w-full',
};

/**
 * Server component ad slot: renders ad placeholder for free users,
 * renders nothing for premium users.
 *
 * Checks subscription status server-side via auth() + isPremiumUser().
 * Actual ad network integration (AdSense, etc.) is future work.
 */
export async function AdSlot({ size = 'inline', className = '' }: AdSlotProps) {
  const session = await auth();
  const userId = session?.user
    ? (session.user as unknown as { id: string }).id
    : null;

  // Don't render ads for premium users
  if (userId && (await isPremiumUser(userId))) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 dark:bg-muted/30 ${sizeStyles[size]} ${className}`}
      role="complementary"
      aria-label="Advertisement"
    >
      <span className="text-xs text-muted-foreground">Advertisement</span>
    </div>
  );
}
