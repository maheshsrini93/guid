import type { Metadata } from "next";
import { PricingContent } from "./pricing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare Free and Premium plans. Get unlimited chats, video guides, offline access, and more with Guid Premium.",
  openGraph: {
    title: "Pricing | Guid",
    description:
      "Compare Free and Premium plans. Unlimited chats, video guides, offline access, ad-free experience.",
    url: "https://guid.how/pricing",
  },
  twitter: {
    card: "summary",
    title: "Pricing | Guid",
    description:
      "Compare Free and Premium plans. Unlimited chats, video guides, offline access, ad-free experience.",
  },
  alternates: {
    canonical: "https://guid.how/pricing",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
