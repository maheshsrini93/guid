import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function HeaderNav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="font-bold text-lg cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
          Guid
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/products" className="cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
            Products
          </Link>
          {session?.user ? (
            <>
              {(session.user as unknown as { role: string }).role === "admin" && (
                <Link href="/studio" className="cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
                  Studio
                </Link>
              )}
              <Link href="/profile" className="cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
                Profile
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-muted-foreground cursor-pointer transition-colors duration-200 ease-out hover:text-primary"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
                Sign in
              </Link>
              <Link href="/register" className="cursor-pointer transition-colors duration-200 ease-out hover:text-primary">
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
