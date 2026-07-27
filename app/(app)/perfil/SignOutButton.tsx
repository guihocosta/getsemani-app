"use client";

import { useTransition } from "react";
import { Button } from "@/ui/Button";
import { signOutAction } from "./actions";

export function SignOutButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="danger"
      className="w-full justify-center"
      disabled={pending}
      onClick={() => start(() => signOutAction())}
    >
      Sair
    </Button>
  );
}
