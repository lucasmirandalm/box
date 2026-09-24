import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createRoom } from "@/lib/rooms/actions";

type CreateRoomPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CreateRoomPage({
  searchParams,
}: CreateRoomPageProps) {
  const params = await searchParams;

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

  const initial =
    userName.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-[#09090d] px-6 py-8 text-white">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-white/40 transition hover:text-white"
        >
          <ArrowLeft size={17} />
          Voltar
        </Link>

        <div className="rounded-3xl border border-white/[0.08] bg-[#0d0d12] p-8 shadow-2xl">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff1152]/10 text-[#ff1152]">
              <Users size={23} />
            </div>

            <h1 className="text-3xl font-black">
              Criar sala
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-white/40">
              Crie uma sala e convide seus amigos
              para desenhar com você em tempo real.
            </p>
          </div>

          <div className="mb-7 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff1152] text-sm font-black">
                {initial}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-white/30">
                Criando sala como
              </p>

              <p className="text-sm font-bold">
                {userName}
              </p>
            </div>
          </div>

          {params.error && (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              {params.error}
            </div>
          )}

          <form
            action={createRoom}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-bold text-white/70"
              >
                Nome da sala
              </label>

              <input
                id="name"
                name="name"
                type="text"
                maxLength={60}
                required
                autoFocus
                placeholder="Ex: Desenhando com amigos"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:ring-2 focus:ring-[#ff1152]/10"
              />
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
              <p className="text-xs font-medium text-white/35">
                A sala terá um código único e poderá
                receber até 5 participantes.
              </p>
            </div>

            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#ff1152] text-sm font-black transition hover:bg-[#ff2e65] active:scale-[0.99]"
            >
              Criar sala
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}