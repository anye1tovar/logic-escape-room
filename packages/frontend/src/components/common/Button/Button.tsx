import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import "./Button.scss";

type ButtonVariant =
  | "primary"
  | "ghost"
  | "neutral"
  | "danger"
  | "interactive"
  | "sun";

type ButtonSize = "sm" | "md";

type SharedProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  pill?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type NativeButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
    to?: never;
  };

type NativeAnchorProps = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    to?: never;
  };

type RouterLinkButtonProps = SharedProps &
  Omit<LinkProps, "className" | "to"> & {
    to: LinkProps["to"];
    href?: never;
  };

export type ButtonProps =
  | NativeButtonProps
  | NativeAnchorProps
  | RouterLinkButtonProps;

function buildClassName({
  className,
  fullWidth,
  pill,
  size = "md",
  variant = "primary",
}: SharedProps) {
  return [
    "ui-button",
    `ui-button--${variant}`,
    `ui-button--${size}`,
    pill ? "ui-button--pill" : "",
    fullWidth ? "ui-button--full-width" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Button(props: ButtonProps) {
  const className = buildClassName(props);

  if ("to" in props && props.to !== undefined) {
    const { children, className: _ignored, fullWidth, pill, size, variant, ...rest } =
      props;
    return <Link {...rest} className={className}>{children}</Link>;
  }

  if ("href" in props && props.href !== undefined) {
    const { children, className: _ignored, fullWidth, pill, size, variant, ...rest } =
      props;
    return <a {...rest} className={className}>{children}</a>;
  }

  const {
    children,
    className: _ignored,
    fullWidth,
    pill,
    size,
    variant,
    type = "button",
    ...rest
  } = props;

  return <button {...rest} className={className} type={type}>{children}</button>;
}
