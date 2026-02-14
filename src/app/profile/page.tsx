import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SaveProductButton } from "@/components/save-product-button";
import { BookmarkedStepsList } from "@/components/bookmarked-steps-list";
import { isValidImageUrl } from "@/lib/image-utils";
import { getChatUsage } from "@/lib/chat/chat-limits";
import { PremiumBadge } from "@/components/premium-badge";

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user!.id },
    select: {
      name: true,
      email: true,
      role: true,
      subscriptionTier: true,
      createdAt: true,
    },
  });

  const chatUsage = await getChatUsage(session.user!.id ?? null);

  const savedProducts = await prisma.savedProduct.findMany({
    where: { userId: session.user!.id },
    select: {
      id: true,
      product: {
        select: {
          id: true,
          article_number: true,
          product_name: true,
          product_type: true,
          price_current: true,
          images: { take: 1, orderBy: { sort_order: "asc" }, select: { url: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {user?.name && <p className="font-medium">{user.name}</p>}
            <p className="text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{user?.role}</Badge>
              {user?.subscriptionTier === "premium" && <PremiumBadge />}
            </div>
            <p className="text-xs text-muted-foreground">
              Joined {user?.createdAt.toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chat Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {chatUsage.sessionsUsed}
              </span>
              <span className="text-sm text-muted-foreground">
                of {chatUsage.sessionsLimit} chats this month
              </span>
            </div>
            {/* Usage bar */}
            <div
              className="h-2 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={chatUsage.sessionsUsed}
              aria-valuemin={0}
              aria-valuemax={chatUsage.sessionsLimit}
              aria-label="Chat usage"
            >
              <div
                className={`h-full rounded-full motion-safe:transition-all ${
                  chatUsage.sessionsRemaining === 0
                    ? "bg-destructive"
                    : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(100, (chatUsage.sessionsUsed / chatUsage.sessionsLimit) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {chatUsage.sessionsRemaining > 0
                ? `${chatUsage.sessionsRemaining} troubleshooting chat${chatUsage.sessionsRemaining !== 1 ? "s" : ""} remaining`
                : "Monthly limit reached. Resets next month."}
            </p>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">
            Saved Products ({savedProducts.length})
          </h2>
          {savedProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No saved products yet. Browse{" "}
              <Link href="/products" className="underline">
                products
              </Link>{" "}
              to save your favorites.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {savedProducts.map(({ product, id }) => (
                <div key={id} className="flex gap-3 rounded-lg border p-3">
                  <Link
                    href={`/products/${product.article_number}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-50"
                  >
                    {isValidImageUrl(product.images[0]?.url) ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.product_name || "Product"}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No img
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <Link
                        href={`/products/${product.article_number}`}
                        className="font-medium text-sm hover:underline line-clamp-1"
                      >
                        {product.product_name || "Unknown"}
                      </Link>
                      {product.product_type && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {product.product_type}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      {product.price_current != null && (
                        <span className="text-sm font-semibold">
                          ${product.price_current.toFixed(2)}
                        </span>
                      )}
                      <SaveProductButton
                        productId={product.id}
                        initialSaved={true}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bookmarked Steps (P2.2.14) */}
      <Separator className="my-8" />
      <div>
        <h2 className="text-xl font-semibold mb-4">Bookmarked Steps</h2>
        <BookmarkedStepsList />
      </div>
    </main>
  );
}
