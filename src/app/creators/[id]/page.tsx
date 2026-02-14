import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Youtube,
  CheckCircle,
  Video,
  ThumbsUp,
  ExternalLink,
  PlayCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CreatorPageProps {
  params: Promise<{ id: string }>;
}

async function getCreator(id: string) {
  return prisma.creatorProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true } },
      videoSubmissions: {
        where: { status: "approved" },
        orderBy: { helpfulVotes: "desc" },
        include: {
          product: {
            select: {
              id: true,
              article_number: true,
              product_name: true,
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: CreatorPageProps): Promise<Metadata> {
  const { id } = await params;
  const creator = await getCreator(id);

  if (!creator) {
    return { title: "Creator Not Found" };
  }

  return {
    title: `${creator.channelName} — Creator Profile`,
    description: `${creator.channelName} shares video guides on Guid. ${creator.videoSubmissions.length} approved video${creator.videoSubmissions.length !== 1 ? "s" : ""}.`,
    openGraph: {
      title: `${creator.channelName} | Guid Creators`,
      description: `Video guides by ${creator.channelName}. Watch step-by-step assembly and troubleshooting videos.`,
      url: `https://guid.how/creators/${id}`,
    },
    alternates: {
      canonical: `https://guid.how/creators/${id}`,
    },
  };
}

export default async function CreatorProfilePage({
  params,
}: CreatorPageProps) {
  const { id } = await params;
  const creator = await getCreator(id);

  if (!creator) {
    notFound();
  }

  const approvedVideos = creator.videoSubmissions;

  return (
    <div className="container mx-auto px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        {/* Creator Header */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
            <Youtube className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">
                {creator.channelName}
              </h1>
              {creator.isVerified && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                >
                  <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  Verified
                </Badge>
              )}
            </div>
            {creator.user.name && (
              <p className="mt-1 text-sm text-muted-foreground">
                {creator.user.name}
              </p>
            )}
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <a
              href={creator.youtubeChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Youtube className="h-4 w-4" aria-hidden="true" />
              Visit Channel
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {creator.subscriberCount !== null && (
            <StatCard
              label="Subscribers"
              value={formatNumber(creator.subscriberCount)}
            />
          )}
          <StatCard
            label="Videos"
            value={String(creator.totalVideos)}
            icon={<Video className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          />
          <StatCard
            label="Helpful Votes"
            value={String(creator.totalHelpfulVotes)}
            icon={
              <ThumbsUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            }
          />
        </div>

        {/* Videos Section */}
        <div className="mt-12">
          <h2 className="text-xl font-bold">Video Guides</h2>

          {approvedVideos.length === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <Video
                className="h-12 w-12 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="text-lg font-semibold">No videos yet</h3>
              <p className="text-sm text-muted-foreground">
                This creator hasn&apos;t had any videos approved yet. Check back
                soon!
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {approvedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  title={video.title}
                  productName={video.product.product_name || "Unknown Product"}
                  articleNumber={video.product.article_number}
                  youtubeVideoId={video.youtubeVideoId || ""}
                  helpfulVotes={video.helpfulVotes}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}

function VideoCard({
  title,
  productName,
  articleNumber,
  youtubeVideoId,
  helpfulVotes,
}: {
  title: string;
  productName: string;
  articleNumber: string;
  youtubeVideoId: string;
  helpfulVotes: number;
}) {
  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card transition-colors duration-200 ease-out hover:border-primary/30">
      {/* Thumbnail */}
      <a
        href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video cursor-pointer overflow-hidden bg-muted"
        aria-label={`Watch "${title}" on YouTube`}
      >
        <img
          src={`https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100">
          <PlayCircle
            className="h-12 w-12 text-white drop-shadow-lg"
            aria-hidden="true"
          />
        </div>
      </a>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {title}
        </h3>
        <Link
          href={`/products/${articleNumber}`}
          className="line-clamp-1 text-xs text-muted-foreground transition-colors duration-200 ease-out hover:text-primary"
        >
          {productName}
        </Link>
        {helpfulVotes > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ThumbsUp className="h-3 w-3" aria-hidden="true" />
            <span>
              {helpfulVotes} helpful vote{helpfulVotes !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}
