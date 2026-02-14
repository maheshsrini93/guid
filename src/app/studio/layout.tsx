import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if ((session.user as unknown as { role: string }).role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-56 border-r bg-muted/50 p-4">
        <h2 className="mb-4 font-semibold text-sm uppercase text-muted-foreground">
          Studio
        </h2>
        <nav className="space-y-1">
          <Link
            href="/studio"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Dashboard
          </Link>
          <Link
            href="/studio/products"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Products
          </Link>
          <Link
            href="/studio/guides"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Guides
          </Link>
          <Link
            href="/studio/submissions"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Submissions
          </Link>
          <Link
            href="/studio/videos"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Videos
          </Link>
          <Link
            href="/studio/ai-generate"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            AI Generate
          </Link>
          <Link
            href="/studio/ai-config"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            AI Config
          </Link>
          <Link
            href="/studio/retailers"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Retailers
          </Link>
          <Link
            href="/studio/matching"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Matching
          </Link>
          <Link
            href="/studio/catalog-sync"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Catalog Sync
          </Link>
          <Link
            href="/studio/analytics/search"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Search Analytics
          </Link>
          <Link
            href="/studio/analytics/affiliate"
            className="block rounded-md px-3 py-2 text-sm hover:bg-accent cursor-pointer"
          >
            Affiliate Analytics
          </Link>
        </nav>
        <div className="mt-8 border-t pt-4">
          <p className="text-xs text-muted-foreground truncate">
            {session.user?.email}
          </p>
          <form
            action={async () => {
              "use server";
              const { signOut } = await import("@/lib/auth");
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="mt-2 text-xs text-muted-foreground hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
