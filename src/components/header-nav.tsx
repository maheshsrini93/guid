import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { PremiumBadge } from "@/components/premium-badge";

export async function HeaderNav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="font-bold text-lg cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
          Guid
        </Link>
        <nav className="ml-auto flex items-center gap-1 sm:gap-4 text-sm">
          <Link href="/products" className="inline-flex min-h-[44px] items-center px-2 cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
            Products
          </Link>
          {session?.user ? (
            <>
              {(session.user as unknown as { role: string }).role === "admin" && (
                <Link href="/studio" className="inline-flex min-h-[44px] items-center px-2 cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
                  Studio
                </Link>
              )}
              <Link href="/profile" className="inline-flex min-h-[44px] items-center gap-1.5 px-2 cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
                Profile
                {(session.user as unknown as { subscriptionTier?: string }).subscriptionTier === "premium" && (
                  <PremiumBadge size="sm" />
                )}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex min-h-[44px] items-center px-2 text-muted-foreground cursor-pointer transition-colors duration-200 ease-out hover:text-primary"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex min-h-[44px] items-center px-2 cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
                Sign in
              </Link>
              <Link href="/register" className="inline-flex min-h-[44px] items-center px-2 cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
                Register
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
