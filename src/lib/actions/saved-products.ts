"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const productIdSchema = z.number().int().positive();

export async function toggleSaveProduct(productId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const validId = productIdSchema.parse(productId);

  const existing = await prisma.savedProduct.findUnique({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId: validId,
      },
    },
  });

  if (existing) {
    await prisma.savedProduct.delete({
      where: { id: existing.id },
    });
    revalidatePath("/profile");
    return { saved: false };
  }

  await prisma.savedProduct.create({
    data: {
      userId: session.user.id,
      productId: validId,
    },
  });
  revalidatePath("/profile");
  return { saved: true };
}

export async function isProductSaved(productId: number) {
  const session = await auth();
  if (!session?.user?.id) return false;

  const validId = productIdSchema.parse(productId);

  const existing = await prisma.savedProduct.findUnique({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId: validId,
      },
    },
  });

  return !!existing;
}
