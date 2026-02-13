"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { submitGuideSubmission } from "@/lib/actions/submissions";

interface SubmitGuideFormProps {
  productId: number;
  articleNumber: string;
}

export function SubmitGuideForm({
  productId,
  articleNumber,
}: SubmitGuideFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [textContent, setTextContent] = useState("");
  const [videoLinks, setVideoLinks] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<string[]>([]);
  const [toolsList, setToolsList] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [difficulty, setDifficulty] = useState("");

  function addVideoLink() {
    setVideoLinks((prev) => [...prev, ""]);
  }

  function removeVideoLink(index: number) {
    setVideoLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVideoLink(index: number, value: string) {
    setVideoLinks((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addExternalLink() {
    setExternalLinks((prev) => [...prev, ""]);
  }

  function removeExternalLink(index: number) {
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExternalLink(index: number, value: string) {
    setExternalLinks((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!textContent.trim()) {
      setError("Please provide assembly instructions.");
      return;
    }

    // Filter out empty links
    const filteredVideoLinks = videoLinks.filter((link) => link.trim());
    const filteredExternalLinks = externalLinks.filter((link) => link.trim());

    startTransition(async () => {
      try {
        await submitGuideSubmission({
          productId,
          textContent: textContent.trim(),
          videoLinks:
            filteredVideoLinks.length > 0 ? filteredVideoLinks : undefined,
          externalLinks:
            filteredExternalLinks.length > 0
              ? filteredExternalLinks
              : undefined,
          toolsList: toolsList.trim() || undefined,
          estimatedTime: estimatedTime
            ? parseInt(estimatedTime, 10)
            : undefined,
          difficulty: difficulty || undefined,
        });
        setSuccess(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to submit guide"
        );
      }
    });
  }

  if (success) {
    return (
      <Card className="mt-8">
        <CardContent className="py-8 text-center">
          <h2 className="text-lg font-semibold">Submission received</h2>
          <p className="mt-2 text-muted-foreground">
            Thank you for contributing! Our team will review your submission and
            use it to create a guide for this product.
          </p>
          <Button
            className="mt-6 cursor-pointer"
            onClick={() => router.push(`/products/${articleNumber}`)}
          >
            Back to product
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {/* Text Instructions */}
      <div className="space-y-2">
        <Label htmlFor="textContent">
          Assembly Instructions <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="textContent"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Describe the assembly steps in order. Include part names, screw types, tools needed at each step, and any tips you found helpful..."
          rows={10}
          required
          className="min-h-[200px]"
        />
        <p className="text-xs text-muted-foreground">
          Be as detailed as possible. Mention part numbers, screw sizes, and
          any tricky steps.
        </p>
      </div>

      {/* Video Links */}
      <div className="space-y-2">
        <Label>Video Links</Label>
        <p className="text-xs text-muted-foreground">
          YouTube or other video URLs showing the assembly process.
        </p>
        {videoLinks.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Label htmlFor={`video-${index}`} className="sr-only">
              Video link {index + 1}
            </Label>
            <Input
              id={`video-${index}`}
              type="url"
              value={link}
              onChange={(e) => updateVideoLink(index, e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 cursor-pointer"
              onClick={() => removeVideoLink(index)}
              aria-label={`Remove video link ${index + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {videoLinks.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={addVideoLink}
          >
            <Plus className="mr-1.5 size-3.5" />
            Add video link
          </Button>
        )}
      </div>

      {/* External Links */}
      <div className="space-y-2">
        <Label>External Resource Links</Label>
        <p className="text-xs text-muted-foreground">
          Blog posts, forum threads, or other helpful resources.
        </p>
        {externalLinks.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Label htmlFor={`external-${index}`} className="sr-only">
              External link {index + 1}
            </Label>
            <Input
              id={`external-${index}`}
              type="url"
              value={link}
              onChange={(e) => updateExternalLink(index, e.target.value)}
              placeholder="https://..."
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 cursor-pointer"
              onClick={() => removeExternalLink(index)}
              aria-label={`Remove external link ${index + 1}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {externalLinks.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={addExternalLink}
          >
            <Plus className="mr-1.5 size-3.5" />
            Add external link
          </Button>
        )}
      </div>

      {/* Tools, Time, Difficulty row */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="toolsList">Tools Needed</Label>
          <Input
            id="toolsList"
            value={toolsList}
            onChange={(e) => setToolsList(e.target.value)}
            placeholder="e.g., Phillips screwdriver, Allen key"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedTime">Estimated Time (minutes)</Label>
          <Input
            id="estimatedTime"
            type="number"
            min={1}
            max={1440}
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            placeholder="e.g., 45"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger id="difficulty" className="w-full">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="cursor-pointer"
        >
          {isPending ? "Submitting..." : "Submit Guide"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="cursor-pointer"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
