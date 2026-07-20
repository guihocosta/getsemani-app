"use client";

import { Card } from "@/ui/Card";
import { Button } from "@/ui/Button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Card className="max-w-sm">
        <p className="text-lg text-text mb-1">Algo deu errado</p>
        <p className="text-sm text-text-muted mb-4">
          Não conseguimos carregar essa tela agora. Tente novamente.
        </p>
        <Button onClick={reset} className="w-full justify-center">
          Tentar de novo
        </Button>
      </Card>
    </div>
  );
}
