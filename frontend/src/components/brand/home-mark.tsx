import { cn } from "@/lib/utils";

type HomeMarkProps = {
  containerClassName?: string;
  iconClassName?: string;
  strokeWidth?: number | string;
};

export function HomeMark({
  containerClassName,
  iconClassName,
  strokeWidth = 1.5,
}: HomeMarkProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center bg-primary text-white",
        containerClassName,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={cn("size-5", iconClassName)}
        aria-hidden
      >
        <path d="M3.5 12.5L12 3.5L20 11" />
        <path d="M5.5 11V21" />
        <path d="M20 11V21" />
        <path d="M9 21V14H15.5V21" />
      </svg>
    </span>
  );
}
