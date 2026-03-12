import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={[
        "bg-surface-primary border border-border rounded-lg shadow-xs overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function CardHeader({ className = "", children, ...props }: CardHeaderProps) {
  return (
    <div
      className={[
        "flex items-center justify-between px-sp-5 py-sp-4 border-b border-border-subtle",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

function CardTitle({ className = "", children, ...props }: CardTitleProps) {
  return (
    <h3
      className={["text-md font-semibold text-text-primary", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardSubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

function CardSubtitle({
  className = "",
  children,
  ...props
}: CardSubtitleProps) {
  return (
    <p
      className={["text-sm text-text-tertiary", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </p>
  );
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function CardBody({ className = "", children, ...props }: CardBodyProps) {
  return (
    <div
      className={["p-sp-5", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function CardFooter({ className = "", children, ...props }: CardFooterProps) {
  return (
    <div
      className={[
        "px-sp-5 py-sp-3 border-t border-border-subtle bg-surface-secondary text-sm text-text-tertiary",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter };
export type { CardProps, CardHeaderProps, CardTitleProps, CardBodyProps, CardFooterProps };
