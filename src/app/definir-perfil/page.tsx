import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account/server";
import { chooseAccountRole, logout } from "@/lib/auth/actions";
import RoleSelector from "@/components/account/role-selector";

export default async function ChooseRolePage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (await getAccountRole(supabase, user.id)) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090d] px-6 py-16 text-white">
      <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#101016] p-6 shadow-2xl sm:p-9">
        <div className="mb-6 text-2xl font-black text-[#ff1152]">box.</div>
        <h1 className="text-3xl font-black">Defina seu perfil</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-white/50">
          O Box agora é voltado ao ensino de desenho. Escolha seu tipo de conta para continuar usando sua conta existente.
        </p>
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <form action={chooseAccountRole} className="space-y-6">
          <RoleSelector />
          <button type="submit" className="w-full rounded-2xl bg-[#ff1152] px-6 py-4 font-extrabold hover:bg-[#ff2c64]">Continuar</button>
        </form>
        <form action={logout} className="mt-4 text-center">
          <button type="submit" className="text-sm font-bold text-white/50 hover:text-white">Sair da conta</button>
        </form>
      </section>
    </main>
  );
}
