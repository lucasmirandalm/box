import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CreateRoomPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const userName =
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Usuário";

  const avatarUrl =
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    null;

  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090d] px-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#ff1152]/10 blur-[140px]" />

      <Link
        href="/"
        className="absolute left-6 top-7 z-10 flex items-center gap-3 md:left-10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff1152] text-lg font-black text-white shadow-[0_0_30px_rgba(255,17,82,0.25)]">
          B
        </div>

        <span className="text-2xl font-extrabold tracking-tight">
          box
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff1152]/10 text-2xl font-black text-[#ff1152]">
            +
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            Crie uma <span className="text-[#ff1152]">sala</span>
          </h1>

          <p className="mt-3 font-medium leading-6 text-white/40">
            Crie seu espaço e convide seus amigos para desenhar com você.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff1152] text-sm font-black text-white">
                {userInitial}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-white/30">
                Criando sala como
              </p>

              <p className="text-sm font-bold text-white">
                {userName}
              </p>
            </div>
          </div>

          <form className="space-y-6">
            <div>
              <label
                htmlFor="roomName"
                className="mb-2 block text-sm font-bold text-white/70"
              >
                Nome da sala
              </label>

              <input
                id="roomName"
                name="roomName"
                type="text"
                placeholder="Ex: Desenhos da galera"
                maxLength={40}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-2xl bg-[#ff1152] px-6 py-4 font-extrabold text-white shadow-[0_10px_35px_rgba(255,17,82,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ff2c64] active:translate-y-0"
            >
              Criar sala
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-white/30">
            <span className="h-2 w-2 rounded-full bg-[#ff1152]" />
            Máximo de 5 pessoas por sala
          </div>
        </div>

        <p className="mt-6 text-center text-sm font-medium text-white/30">
          Já possui um código?{" "}
          <Link
            href="/entrar-na-sala"
            className="font-bold text-[#ff1152] transition hover:text-[#ff4676]"
          >
            Entrar em uma sala
          </Link>
        </p>
      </div>
    </main>
  );
}