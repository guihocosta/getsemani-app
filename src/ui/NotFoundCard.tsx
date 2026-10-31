import Link from "next/link";
import { Card } from "./Card";

export function NotFoundCard() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Card className="max-w-sm">
        <h1 className="text-lg text-text mb-1">Página não encontrada</h1>
        <p className="text-sm text-text-muted mb-4">Esse endereço não existe ou você não tem acesso a ele.</p>
        <Link href="/" className="text-sm text-primary font-medium underline underline-offset-2">
          Voltar para o início
        </Link>
      </Card>
    </div>
  );
}
