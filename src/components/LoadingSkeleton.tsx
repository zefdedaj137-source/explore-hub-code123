import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ProfileCardSkeleton = () => (
  <Card className="overflow-hidden shadow-elegant">
    <Skeleton className="aspect-[3/4] w-full" />
    <div className="p-6 space-y-3">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-14 w-14 rounded-full" />
      </div>
    </div>
  </Card>
);

export const MatchCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-[3/4] w-full" />
    <div className="p-4">
      <Skeleton className="h-10 w-full" />
    </div>
  </Card>
);

export const MessageSkeleton = ({ isOwn = false }: { isOwn?: boolean }) => (
  <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
    <Card className={`max-w-[70%] p-4 space-y-2`}>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-16" />
    </Card>
  </div>
);

export const ProfileFormSkeleton = () => (
  <div className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
      <Skeleton className="aspect-square rounded-xl" />
      <Skeleton className="aspect-square rounded-xl" />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-10 w-full" />
  </div>
);

export const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-dvh flex items-center justify-center bg-gradient-subtle">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);
