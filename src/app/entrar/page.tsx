import Link from "next/link";
import { login } from "@/lib/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const { error, message } = await searchParams;

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
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff1152]/10 text-xl font-black text-[#ff1152]">
            B
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            Bem-vindo de <span className="text-[#ff1152]">volta</span>
          </h1>

          <p className="mt-3 font-medium leading-6 text-white/40">
            Entre na sua conta para continuar desenhando com seus amigos.
          </p>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/30 sm:p-8">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 rounded-2xl border border-[#ff1152]/20 bg-[#ff1152]/10 px-4 py-3 text-sm font-bold text-[#ff1152]">
              {message}
            </div>
          )}

          <form action={login} className="space-y-6">
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
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-bold text-white/70"
                >
                  Senha
                </label>

                <Link
                  href="/recuperar-senha"
                  className="text-xs font-bold text-[#ff1152] transition hover:text-[#ff4676]"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 font-medium text-white outline-none transition placeholder:text-white/20 focus:border-[#ff1152]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[#ff1152]/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#ff1152] px-6 py-4 font-extrabold text-white shadow-[0_10px_35px_rgba(255,17,82,0.2)] transition hover:-translate-y-0.5 hover:bg-[#ff2c64] active:translate-y-0"
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm font-medium text-white/30">
          Ainda não possui uma conta?{" "}
          <Link
            href="/criar-conta"
            className="font-bold text-[#ff1152] transition hover:text-[#ff4676]"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}