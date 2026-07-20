import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

// Seed de exemplo. Usuarios reais nascem do login Supabase; aqui usamos UUIDs
// placeholder para demonstracao local (ajuste/os remova ao integrar Auth real).
async function main() {
  const louvor = await prisma.ministry.create({
    data: {
      name: "Louvor",
      color: "#FA8F14",
      roles: { create: [{ name: "Vocal" }, { name: "Violão" }, { name: "Bateria" }] },
    },
    include: { roles: true },
  });

  const midia = await prisma.ministry.create({
    data: {
      name: "Mídia",
      color: "#5D8FC4",
      roles: { create: [{ name: "Projeção" }, { name: "Som" }, { name: "Câmera" }] },
    },
    include: { roles: true },
  });

  const admin = await prisma.user.create({
    data: { id: randomUUID(), name: "Admin Getsemani", email: "admin@getsemani.exemplo", isAdmin: true },
  });

  const lider = await prisma.user.create({
    data: { id: randomUUID(), name: "Líder Louvor", email: "lider@getsemani.exemplo" },
  });

  const vols = await Promise.all(
    ["Ana", "Bruno", "Carla", "Diego"].map((n, i) =>
      prisma.user.create({
        data: { id: randomUUID(), name: n, email: `vol${i}@getsemani.exemplo` },
      }),
    ),
  );

  await prisma.membership.create({
    data: { userId: lider.id, ministryId: louvor.id, role: "LEADER" },
  });
  for (const v of vols) {
    await prisma.membership.create({
      data: { userId: v.id, ministryId: louvor.id, role: "VOLUNTEER" },
    });
  }
  await prisma.membership.create({
    data: { userId: vols[0].id, ministryId: midia.id, role: "VOLUNTEER" },
  });

  console.log("Seed ok:", {
    louvor: louvor.name,
    midia: midia.name,
    admin: admin.email,
    voluntarios: vols.length,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
