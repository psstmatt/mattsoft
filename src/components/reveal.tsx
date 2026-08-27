import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useSound } from "@/lib/sound";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li" | "p" | "header" | "footer";
  className?: string;
  sound?: boolean;
};

export function Reveal({ children, delay = 0, as = "div", className, sound = false }: RevealProps) {
  const reduced = useReducedMotion();
  const { play } = useSound();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
      transition={{ duration: 0.32, delay: Math.min(delay, 0.05), ease: [0.16, 1, 0.3, 1] }}
      onViewportEnter={() => {
        if (sound) play("reveal");
      }}
    >
      {children}
    </MotionTag>
  );
}

export function RevealLines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <Reveal as="p" key={i} delay={i * 0.06} className="mb-4 last:mb-0">
          {line}
        </Reveal>
      ))}
    </div>
  );
}
