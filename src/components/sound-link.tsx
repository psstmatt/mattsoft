import { createLink } from "@tanstack/react-router";
import { forwardRef, type ComponentProps } from "react";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const linkClass =
  "inline underline decoration-[0.5px] underline-offset-[5px] decoration-muted-foreground/50 transition-[color,text-decoration-color] duration-300 hover:decoration-foreground hover:text-foreground";

/** Returns hover/click handlers that emit the interface tones. */
export function useLinkSound() {
  const { play } = useSound();
  return {
    onMouseEnter: () => play("hover"),
    onClick: () => play("click"),
  };
}

const SoundAnchorBase = forwardRef<HTMLAnchorElement, ComponentProps<"a">>(
  ({ className, onMouseEnter, onClick, ...props }, ref) => {
    const sound = useLinkSound();
    return (
      <a
        ref={ref}
        {...props}
        className={cn(linkClass, className)}
        onMouseEnter={(e) => {
          sound.onMouseEnter();
          onMouseEnter?.(e);
        }}
        onClick={(e) => {
          sound.onClick();
          onClick?.(e);
        }}
      />
    );
  },
);
SoundAnchorBase.displayName = "SoundAnchorBase";

export const SoundAnchor = SoundAnchorBase;

/** TanStack Link with interface sound, fully typed for routes and params. */
export const SoundLink = createLink(SoundAnchorBase);
