"use client";

import { useFormStatus } from "react-dom";
import { SecondaryButton, DangerButton } from "@/components/ui";

export function ConfirmSubmitButton({
  children,
  message,
  variant = "secondary",
  disabled = false,
}: {
  children: React.ReactNode;
  message: string;
  variant?: "secondary" | "danger";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const Button = variant === "danger" ? DangerButton : SecondaryButton;

  return (
    <Button
      disabled={disabled || pending}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Working..." : children}
    </Button>
  );
}
