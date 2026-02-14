import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatorRegistrationForm } from "./creator-registration-form";

export const metadata: Metadata = {
  title: "Become a Creator",
  description:
    "Register as a creator on Guid to share video guides and help others assemble, set up, and fix their products.",
  openGraph: {
    title: "Become a Creator | Guid",
    description:
      "Share your YouTube video guides on Guid and help others with product assembly and troubleshooting.",
    url: "https://guid.how/creators/register",
  },
  alternates: {
    canonical: "https://guid.how/creators/register",
  },
};

export default async function CreatorRegistrationPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // If user already has a creator profile, redirect to it
  const existingProfile = await prisma.creatorProfile.findUnique({
    where: { userId: (session.user as unknown as { id: string }).id },
    select: { id: true },
  });

  if (existingProfile) {
    redirect(`/creators/${existingProfile.id}`);
  }

  return (
    <div className="container mx-auto px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Become a Creator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Share your YouTube video guides on Guid and help others assemble, set
          up, and troubleshoot their products.
        </p>
        <CreatorRegistrationForm />
      </div>
    </div>
  );
}
