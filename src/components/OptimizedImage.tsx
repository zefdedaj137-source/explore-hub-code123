import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  fallback?: string;
  /** Show a blurred low-res placeholder while loading */
  blurPlaceholder?: boolean;
  /** Intrinsic width — set to prevent layout shift (CLS) */
  width?: number | string;
  /** Intrinsic height — set to prevent layout shift (CLS) */
  height?: number | string;
  /** Mark this as the LCP image: eager load + high fetch priority */
  priority?: boolean;
}

export const OptimizedImage = ({
  src,
  alt = "",
  className,
  fallback = "/placeholder.svg",
  blurPlaceholder = true,
  width,
  height,
  priority = false,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If image is already cached, mark loaded immediately
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = () => setLoaded(true);
  const handleError = () => {
    setError(true);
    setLoaded(true);
  };

  const displaySrc = error ? fallback : src || fallback;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Blur placeholder */}
      {blurPlaceholder && !loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
};
