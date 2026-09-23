import Link from "next/link";
import { register } from "@/lib/auth/actions";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090d] px-6 py-24 text-white">
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
            Crie sua <span className="text-[#ff1152]">conta</span>
          </h1>

          <p className="mt-3 font-medium leading-6 text-white/40">
            Entre no Box e comece a criar junto com seus amigos.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/30 sm:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
              {error}
            </div>
          )}

          <form action={register} className="space-y-6">
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
                placeholder="Como devemos te chamar?"
                maxLength={24}
                autoComplete="name"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
              />
            </div>

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
                placeholder="voce@exemplo.com"
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-white/70"
              >
                Senha
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Crie uma senha"
                minLength={8}
                autoComplete="new-password"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
              />

              <p className="mt-2 text-xs font-medium text-white/25">
                Use pelo menos 8 caracteres.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-bold text-white/70"
              >
                Confirmar senha
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Digite sua senha novamente"
                minLength={8}
                autoComplete="new-password"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#ff1152] px-6 py-4 font-extrabold text-white shadow-[0_10px_35px_rgba(255,17,82,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ff2c64] active:translate-y-0"
            >
              Criar conta
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm font-medium text-white/30">
          Já possui uma conta?{" "}
          <Link
            href="/entrar"
            className="font-bold text-[#ff1152] transition hover:text-[#ff4676]"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}