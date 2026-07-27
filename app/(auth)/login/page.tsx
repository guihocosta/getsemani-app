import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { Card } from "@/ui/Card";
import { LoginForm } from "./LoginForm";

const ERROR_LABEL: Record<string, string> = {
  auth: "Não deu para entrar. Tente de novo.",
  falha: "Algo deu errado ao entrar. Tente de novo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const { error, ref } = await searchParams;
  const errorMessage = error ? ERROR_LABEL[error] ?? ERROR_LABEL.falha : null;

  return (
    <div
      className="min-h-dvh flex items-center justify-center px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <Card className="w-full max-w-sm">
        <h1 className="text-3xl tracking-tight text-text mb-1">Bem-vindo(a)</h1>
        <p className="eyebrow mb-6">Escalas dos voluntários</p>
        {errorMessage && (
          <p className="text-xs text-danger mb-4">
            {errorMessage}
            {ref && <span className="text-text-muted"> · cód. {ref}</span>}
          </p>
        )}
        <LoginForm />
      </Card>
    </div>
  );
}
