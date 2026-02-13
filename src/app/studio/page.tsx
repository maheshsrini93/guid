import { prisma } from "@/lib/prisma";

export default async function StudioDashboard() {
  // Start of current calendar month (UTC)
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [
    productCount,
    withAssembly,
    withImages,
    guideCount,
    userCount,
    totalChatSessions,
    monthlyChatSessions,
    totalChatMessages,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.productDocument.count({ where: { document_type: "assembly" } }),
    prisma.productImage.count(),
    prisma.assemblyGuide.count(),
    prisma.user.count(),
    prisma.chatSession.count(),
    prisma.chatSession.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.chatMessage.count(),
  ]);

  const stats = [
    { label: "Total Products", value: productCount.toLocaleString() },
    { label: "Assembly PDFs", value: withAssembly.toLocaleString() },
    { label: "Product Images", value: withImages.toLocaleString() },
    { label: "Assembly Guides", value: guideCount.toLocaleString() },
    { label: "Registered Users", value: userCount.toLocaleString() },
    { label: "Chat Sessions (Total)", value: totalChatSessions.toLocaleString() },
    { label: "Chat Sessions (This Month)", value: monthlyChatSessions.toLocaleString() },
    { label: "Chat Messages", value: totalChatMessages.toLocaleString() },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
