import { requireUser } from "@/modules/identity/services/authz";
import { Card } from "@/ui/Card";
import { ProfileForm } from "./ProfileForm";
import { InstallSection } from "./InstallSection";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl text-text">Perfil</h1>
      </header>

      <Card className="mb-4">
        <ProfileForm name={user.name} phone={user.phone ?? ""} />
      </Card>

      <InstallSection />
    </div>
  );
}
