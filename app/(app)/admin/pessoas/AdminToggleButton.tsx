"use client";

import { useTransition } from "react";
import { Button } from "@/ui/Button";
import { useConfirm } from "@/ui/ConfirmDialog";
import { setAdminAction } from "./actions";

export function AdminToggleButton({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  const { confirm, dialog } = useConfirm();

  async function toggle() {
    if (!isAdmin) {
      const ok = await confirm({
        title: "Tornar essa pessoa admin?",
        description: "Admins têm acesso total: podem gerenciar ministérios, pessoas e todas as escalas.",
        confirmLabel: "Tornar admin",
      });
      if (!ok) return;
    }
    start(() => setAdminAction(userId, !isAdmin));
  }

  return (
    <>
      {dialog}
      <Button
        variant={isAdmin ? "secondary" : "ghost"}
        className="py-1.5 px-3 text-xs"
        disabled={pending}
        onClick={toggle}
      >
        {isAdmin ? "Admin" : "Tornar admin"}
      </Button>
    </>
  );
}
