import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

export const ProfileCardSkeleton = () => (
  <Card className="overflow-hidden shadow-elegant animate-card-enter rounded-3xl">
    <Skeleton className="aspect-[3/4] w-full rounded-none" />
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-2/5 rounded-xl" />
        <Skeleton className="h-5 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-4 w-1/3 rounded-xl" />
      <Skeleton className="h-4 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4 rounded-xl" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
      </div>
    </div>
  </Card>
);

export const MatchCardSkeleton = () => (
  <Card className="overflow-hidden rounded-2xl animate-card-enter">
    <Skeleton className="aspect-[3/4] w-full rounded-none" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-5 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-1/2 rounded-lg" />
    </div>
  </Card>
);

export const MessageSkeleton = ({ isOwn = false }: { isOwn?: boolean }) => (
  <div className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2`}>
    {!isOwn && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
    <div className={`space-y-1.5 max-w-[60%]`}>
      <Skeleton className={`h-10 rounded-2xl ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`} />
      <Skeleton className={`h-3 w-12 rounded ${isOwn ? "ml-auto" : ""}`} />
    </div>
  </div>
);

export const ProfileFormSkeleton = () => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
      <Skeleton className="aspect-square rounded-2xl" />
      <Skeleton className="aspect-square rounded-2xl" />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
    <Skeleton className="h-32 w-full rounded-xl" />
    <Skeleton className="h-11 w-full rounded-xl" />
  </div>
);

/** Full-page loading screen with branded heart-pulse spinner */
export const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-dvh flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-5">
      {/* Branded spinner: rotating ring + pulsing heart */}
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/15 border-t-primary animate-spin" />
        {/* Inner branded icon */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Heart className="w-4 h-4 text-primary fill-primary/60" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground tracking-wide">{message}</p>
    </div>
  </div>
);
