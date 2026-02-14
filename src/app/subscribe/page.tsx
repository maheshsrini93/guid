import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscribeRedirect } from "./subscribe-redirect";

export const metadata: Metadata = {
  title: "Subscribe to Premium | Guid",
  description:
    "Upgrade to Guid Premium for unlimited AI chats, video guides, offline access, and more.",
  robots: { index: false },
};

export default function SubscribePage() {
  return (
    <Suspense fallback={null}>
      <SubscribeRedirect />
    </Suspense>
  );
}
