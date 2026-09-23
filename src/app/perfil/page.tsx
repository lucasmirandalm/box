import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateEmail,
  updatePassword,
  updateProfile,
} from "@/lib/profile/actions";

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ProfilePage({
  searchParams,
}: ProfilePageProps) {
  const { error, message } = await searchParams;

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

  const pronouns =
    user.user_metadata?.pronouns ??
    "not-informed";

  const avatarUrl =
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    null;

  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090d] px-6 pb-20 text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#ff1152]/10 blur-[140px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between py-7">
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff1152] text-lg font-black text-white shadow-[0_0_30px_rgba(255,17,82,0.25)]">
            B
          </div>

          <span className="text-2xl font-extrabold tracking-tight">
            box
          </span>
        </Link>

        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white/70 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
        >
          Voltar
        </Link>
      </header>

      <section className="relative z-10 mx-auto mt-12 w-full max-w-3xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-bold text-[#ff1152]">
            Sua conta
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Seu <span className="text-[#ff1152]">perfil</span>
          </h1>

          <p className="mt-3 max-w-xl font-medium leading-7 text-white/40">
            Gerencie suas informações pessoais e preferências dentro do Box.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-400">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-[#ff1152]/20 bg-[#ff1152]/10 px-5 py-4 text-sm font-bold text-[#ff1152]">
            {message}
          </div>
        )}

        <div className="mb-6 flex items-center gap-5 rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#ff1152] text-2xl font-black text-white shadow-[0_0_30px_rgba(255,17,82,0.2)]">
              {userInitial}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-xl font-black">
              {userName}
            </h2>

            <p className="mt-1 truncate text-sm font-medium text-white/35">
              {user.email}
            </p>

            <p className="mt-2 text-xs font-bold text-[#ff1152]">
              Membro do Box
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-black">
                Informações pessoais
              </h2>

              <p className="mt-1 text-sm font-medium text-white/35">
                Essas informações serão usadas dentro das salas.
              </p>
            </div>

            <form
              action={updateProfile}
              className="space-y-6"
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Nome
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={userName}
                  maxLength={24}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="pronouns"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Qual pronome você prefere?
                </label>

                <select
                  id="pronouns"
                  name="pronouns"
                  defaultValue={pronouns}
                  className="w-full rounded-2xl border border-white/10 bg-[#101016] px-4 py-3.5 font-medium text-white outline-none transition focus:border-[#ff1152]/60 focus:ring-4 focus:ring-[#ff1152]/10"
                >
                  <option value="he-him">
                    Ele / Dele
                  </option>

                  <option value="she-her">
                    Ela / Dela
                  </option>

                  <option value="they-them">
                    Elu / Delu
                  </option>

                  <option value="not-informed">
                    Prefiro não informar
                  </option>
                </select>

                <p className="mt-2 text-xs font-medium leading-5 text-white/25">
                  O pronome poderá aparecer junto ao seu usuário dentro das salas.
                </p>
              </div>

              <button
                type="submit"
                className="rounded-2xl bg-[#ff1152] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_30px_rgba(255,17,82,0.2)] transition hover:bg-[#ff2c64]"
              >
                Salvar alterações
              </button>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-black">
                E-mail
              </h2>

              <p className="mt-1 text-sm font-medium text-white/35">
                Altere o endereço usado para acessar sua conta.
              </p>
            </div>

            <form
              action={updateEmail}
              className="space-y-6"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  E-mail
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
                />
              </div>

              <button
                type="submit"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3.5 text-sm font-extrabold text-white/80 transition hover:border-[#ff1152]/30 hover:bg-[#ff1152]/10 hover:text-white"
              >
                Alterar e-mail
              </button>
            </form>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-black">
                Senha
              </h2>

              <p className="mt-1 text-sm font-medium text-white/35">
                Escolha uma senha segura com pelo menos 8 caracteres.
              </p>
            </div>

            <form
              action={updatePassword}
              className="space-y-6"
            >
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Senha atual
                </label>

                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="Digite sua senha atual"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Nova senha
                </label>

                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Digite sua nova senha"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-bold text-white/70"
                >
                  Confirmar nova senha
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Digite sua nova senha novamente"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
                />
              </div>

              <button
                type="submit"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3.5 text-sm font-extrabold text-white/80 transition hover:border-[#ff1152]/30 hover:bg-[#ff1152]/10 hover:text-white"
              >
                Alterar senha
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}