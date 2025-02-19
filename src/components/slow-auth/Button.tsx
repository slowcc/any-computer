import clsx from "clsx";
import React from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps {
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  className,
  children,
  disabled,
}) => {
  const mergedClassName = twMerge(
    clsx(
      "px-2 py-1 bg-bg-hover rounded text-text-secondary text-xs transition-opacity",
      "hover:opacity-80 active:opacity-70",
      disabled && "opacity-50 cursor-not-allowed pointer-events-none",
      className
    )
  );

  return (
    <button
      onClick={disabled ? () => null : onClick}
      className={mergedClassName}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
