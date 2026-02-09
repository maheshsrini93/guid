import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function HeaderNav() {
  const session = await auth();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="font-bold text-lg">
          Guid
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/products" className="hover:underline">
            Products
          </Link>
          {session?.user ? (
            <>
              {(session.user as unknown as { role: string }).role === "admin" && (
                <Link href="/studio" className="hover:underline">
                  Studio
                </Link>
              )}
              <Link href="/profile" className="hover:underline">
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
                  className="text-muted-foreground hover:underline"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Sign in
              </Link>
              <Link href="/register" className="hover:underline">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
