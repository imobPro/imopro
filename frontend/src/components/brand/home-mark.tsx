import { cn } from "@/lib/utils";

type HomeMarkProps = {
  containerClassName?: string;
  iconClassName?: string;
};

export function HomeMark({ containerClassName, iconClassName }: HomeMarkProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden bg-primary",
        containerClassName,
      )}
    >
      <img
        src="/logo-imobpro.png"
        alt=""
        aria-hidden
        className={cn(
          "size-full translate-x-[4%] translate-y-[3%] scale-[0.77] object-contain",
          iconClassName,
        )}
      />
    </span>
  );
}
