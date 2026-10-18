import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "link";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[16px] font-medium transition-colors hover:opacity-90 active:opacity-75 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-signal text-surface",
  secondary: "border border-line bg-surface text-ink",
  danger: "bg-full text-surface",
  link: "text-signal hover:underline",
};

function classesFor(variant: ButtonVariant, className?: string): string {
  return `${base} ${variants[variant]}${className ? ` ${className}` : ""}`;
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={classesFor(variant, className)} {...props} />;
}

/** Same look as Button, but navigates. Use for actions that lead somewhere. */
export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={classesFor(variant, className)}>
      {children}
    </Link>
  );
}
