import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VideoSubmissionForm } from "./video-submission-form";

export const metadata: Metadata = {
  title: "Submit a Video Guide",
  description:
    "Submit your YouTube video guide for a product on Guid. Help others with assembly, setup, and troubleshooting.",
  openGraph: {
    title: "Submit a Video Guide | Guid",
    description:
      "Share your YouTube video guides on Guid and help others with product assembly.",
    url: "https://guid.how/creators/submit",
  },
  alternates: {
    canonical: "https://guid.how/creators/submit",
  },
};

export default async function VideoSubmissionPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as unknown as { id: string }).id;

  // Must be a registered creator
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true, channelName: true },
  });

  if (!profile) {
    redirect("/creators/register");
  }

  return (
    <div className="container mx-auto px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-lg">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Submit a Video Guide
        </h1>
        <p className="mt-2 text-muted-foreground">
          Share a YouTube video guide for a product. Submissions are reviewed
          before being published.
        </p>
        <VideoSubmissionForm />
      </div>
    </div>
  );
}
