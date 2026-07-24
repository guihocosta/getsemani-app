import { redirect } from "next/navigation";
import { getSessionUser } from "@/modules/identity/services/authz";
import { Card } from "@/ui/Card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

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
        <LoginForm />
      </Card>
    </div>
  );
}
