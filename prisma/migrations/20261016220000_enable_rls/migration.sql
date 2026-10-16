-- Fecha a Data API (PostgREST) do Supabase para as tabelas do app.
-- O schema "public" e exposto aos roles anon/authenticated, e a anon key e publica
-- (vai no bundle do navegador). Sem RLS, qualquer pessoa leria e escreveria estas
-- tabelas direto em /rest/v1, sem passar pela authz do app.
--
-- RLS ligado e SEM policies = anon/authenticated nao veem nem alteram nada.
-- O app nao e afetado: o Prisma conecta como o dono das tabelas (postgres), que
-- ignora RLS (sem FORCE). O app nao usa o cliente Supabase para dados, so para auth.
--
-- Toda tabela nova precisa de "ENABLE ROW LEVEL SECURITY" na propria migration.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ministry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSkill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScheduleRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Occurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Slot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Allocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SwapRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Unavailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Song" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OccurrenceSong" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
