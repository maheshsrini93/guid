"use client";

import { useActionState } from "react";
import { Youtube, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerCreator,
  type RegisterCreatorResult,
} from "@/lib/actions/creators";

const initialState: RegisterCreatorResult = { success: false };

async function formAction(
  _prev: RegisterCreatorResult,
  formData: FormData
): Promise<RegisterCreatorResult> {
  return registerCreator(formData);
}

export function CreatorRegistrationForm() {
  const [state, action, isPending] = useActionState(formAction, initialState);

  return (
    <form action={action} className="mt-8 flex flex-col gap-6">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive dark:bg-destructive/10"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Label htmlFor="youtubeChannelUrl">
          YouTube Channel URL <span className="text-primary">*</span>
        </Label>
        <div className="relative">
          <Youtube
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="youtubeChannelUrl"
            name="youtubeChannelUrl"
            type="url"
            placeholder="https://youtube.com/@yourchannel"
            required
            className="pl-10"
            aria-describedby="channelUrl-help channelUrl-error"
            aria-invalid={!!state.fieldErrors?.youtubeChannelUrl}
          />
        </div>
        <p id="channelUrl-help" className="text-xs text-muted-foreground">
          Accepted formats: youtube.com/@handle, youtube.com/c/name,
          youtube.com/channel/ID
        </p>
        {state.fieldErrors?.youtubeChannelUrl && (
          <p
            id="channelUrl-error"
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {state.fieldErrors.youtubeChannelUrl[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Label htmlFor="channelName">
          Channel Name <span className="text-primary">*</span>
        </Label>
        <Input
          id="channelName"
          name="channelName"
          type="text"
          placeholder="Your channel name"
          required
          maxLength={100}
          aria-describedby="channelName-error"
          aria-invalid={!!state.fieldErrors?.channelName}
        />
        {state.fieldErrors?.channelName && (
          <p
            id="channelName-error"
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {state.fieldErrors.channelName[0]}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending}>
        {isPending ? (
          <>
            <Loader2
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            Registering...
          </>
        ) : (
          "Register as Creator"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        By registering, you agree to share your YouTube content on Guid. Your
        channel will appear on your creator profile after review.
      </p>
    </form>
  );
}
