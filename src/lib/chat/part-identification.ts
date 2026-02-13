import { prisma } from "@/lib/prisma";

/**
 * Common IKEA furniture hardware parts with their descriptions.
 * Used to enrich the system prompt when a user sends a photo
 * for part identification.
 */
const COMMON_PARTS_REFERENCE = `
## Common Furniture Hardware Reference
When identifying parts from photos, reference these common types:

**Fasteners:**
- Cam lock (barrel nut) — cylindrical metal piece with a cross-slot, rotates to lock panels together
- Cam screw — threaded bolt that goes into the cam lock
- Wooden dowel — round wooden pin for alignment (typically 8mm or 10mm diameter)
- Shelf pin (support) — small metal or plastic pin for adjustable shelves
- Hex bolt / Allen bolt — bolt with hexagonal socket head
- Cross-head screw (Phillips) — standard screw with + shaped head
- Confirmat screw — thick furniture screw with coarse thread, used for chipboard

**Connectors:**
- Rail bracket — L-shaped or U-shaped metal bracket for attaching rails
- Corner bracket — angled metal piece for reinforcing corners
- Hanging bracket — wall-mount bracket (often with keyhole slots)
- Hinge — door/flap attachment (soft-close, push-open, or standard)
- Drawer runner / slide — metal rail for drawer movement

**Tools (typically included):**
- Allen key / hex wrench — L-shaped tool for hex bolts (usually 4mm)
- Phillips screwdriver tip — cross-head bit for power drills

**Misc:**
- Plastic cover cap — snap-on cap to hide screw heads (matches furniture color)
- Anti-tip strap / wall anchor — safety strap to secure furniture to wall
- Felt pad — adhesive pad for floor protection
- Bumper / damper — rubber or silicone pad for soft-closing
`.trim();

/**
 * Build an enhanced system prompt section for part identification
 * when the user has attached an image.
 *
 * Includes common parts reference and product-specific parts list
 * extracted from assembly guide steps or document context.
 */
export async function buildPartIdentificationContext(
  productId?: number
): Promise<string> {
  const sections: string[] = [];

  sections.push(`
## Part Identification Mode (Photo Attached)
The user has sent a photo. In addition to general troubleshooting, perform these steps:

1. **Identify the item** in the photo — determine if it's a part, tool, hardware piece, or a section of furniture
2. **Name it precisely** — use the common name AND any official part name/number from the product context
3. **Describe its purpose** — explain what the part does and where it goes in the assembly
4. **Check against the parts list** — if product context includes a parts list, match the photo to a specific part number
5. **Suggest replacements** — if the part appears damaged or missing, advise the user to:
   - Check if spare parts were included in the original packaging
   - Contact the retailer's spare parts service (for IKEA: visit the spare parts page on ikea.com or visit a store)
   - Reference the specific part number so the user can request exactly what they need

Format your part identification response with:
- **Part Name**: (what it is)
- **Part Number**: (if identifiable from context, or "Not identifiable from photo")
- **Purpose**: (what it does / where it goes)
- **Condition**: (based on visible state in photo)
- **Next Steps**: (specific advice)
`);

  sections.push(COMMON_PARTS_REFERENCE);

  // If we have a product ID, try to extract a parts list from the assembly guide
  if (productId) {
    const partsContext = await extractProductParts(productId);
    if (partsContext) {
      sections.push(partsContext);
    }
  }

  return sections.join("\n\n");
}

/**
 * Extract parts information from the product's assembly guide steps
 * and documents. Assembly guides often mention specific part numbers
 * and quantities in early steps.
 */
async function extractProductParts(productId: number): Promise<string | null> {
  // Fetch assembly guide steps which often reference part numbers
  const guide = await prisma.assemblyGuide.findFirst({
    where: { productId, published: true },
    select: {
      steps: {
        orderBy: { stepNumber: "asc" },
        select: {
          stepNumber: true,
          title: true,
          instruction: true,
        },
      },
    },
  });

  if (!guide || guide.steps.length === 0) return null;

  // Extract part references from instructions
  // IKEA parts are typically referenced as numbers in formats like:
  //   "Part 100345" "dowel (123456)" "screw x4" or "bag 1 / bag 2"
  const partMentions = new Set<string>();
  const partPattern = /(?:part|piece|screw|dowel|cam|bolt|pin|bracket|hinge|nail|peg|plug|washer|nut)\s*(?:#?\d+|[A-Z]\d*)/gi;

  for (const step of guide.steps) {
    const matches = step.instruction.match(partPattern);
    if (matches) {
      for (const m of matches) {
        partMentions.add(m.trim());
      }
    }
  }

  if (partMentions.size === 0) return null;

  const lines = [
    "## Product-Specific Parts Referenced in Assembly Guide",
    "The following parts are mentioned in this product's assembly instructions:",
    "",
  ];

  for (const part of partMentions) {
    lines.push(`- ${part}`);
  }

  lines.push(
    "",
    "Use these references to help identify parts the user photographs."
  );

  return lines.join("\n");
}
