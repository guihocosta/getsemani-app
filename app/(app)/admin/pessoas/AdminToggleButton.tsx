"use client";

import { useTransition } from "react";
import { Button } from "@/ui/Button";
import { setAdminAction } from "./actions";

export function AdminToggleButton({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={isAdmin ? "secondary" : "ghost"}
      className="py-1.5 px-3 text-xs"
      disabled={pending}
      onClick={() => start(() => setAdminAction(userId, !isAdmin))}
    >
      {isAdmin ? "Admin" : "Tornar admin"}
    </Button>
  );
}
