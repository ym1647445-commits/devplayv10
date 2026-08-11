import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";

export type ButtonSize =
  | "small"
  | "medium"
  | "large"
  | "icon";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;

  fullWidth?: boolean;
  loading?: boolean;

  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}