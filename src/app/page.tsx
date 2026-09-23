import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth/actions";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName =
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Usuário";

  const avatarUrl =
    user?.user_metadata?.avatar_url ??
    user?.user_metadata?.picture ??
    null;

  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090d] text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-300px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#ff1152]/10 blur-[140px]" />

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff1152] text-lg font-black text-white shadow-[0_0_30px_rgba(255,17,82,0.25)]">
            B
          </div>

          <span className="text-2xl font-extrabold tracking-tight">
            box
          </span>
        </Link>

        {user ? (
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-white/20 hover:bg-white/[0.07] [&::-webkit-details-marker]:hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff1152] text-sm font-black text-white">
                  {userInitial}
                </div>
              )}

              <span className="max-w-36 truncate text-sm font-bold text-white/90">
                {userName}
              </span>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 text-white/40 transition-transform group-open:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </summary>

            <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#111116] p-2 shadow-2xl shadow-black/50">
              <div className="border-b border-white/[0.06] px-3 py-3">
                <p className="truncate text-sm font-bold text-white">
                  {userName}
                </p>

                <p className="mt-0.5 truncate text-xs font-medium text-white/30">
                  {user.email}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/perfil"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 21a8 8 0 0 0-16 0"
                    />
                    <circle cx="12" cy="7" r="4" />
                  </svg>

                  Ver perfil
                </Link>

                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#ff1152] transition hover:bg-[#ff1152]/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16 17 5-5-5-5"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12H9"
                      />
                    </svg>

                    Sair
                  </button>
                </form>
              </div>
            </div>
          </details>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/entrar"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              Entrar
            </Link>

            <Link
              href="/criar-conta"
              className="rounded-xl bg-[#ff1152] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_30px_rgba(255,17,82,0.2)] transition hover:bg-[#ff2c64]"
            >
              Criar conta
            </Link>
          </div>
        )}
      </header>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center md:pt-32">
        <div className="mb-6 rounded-full border border-[#ff1152]/20 bg-[#ff1152]/10 px-4 py-2 text-sm font-bold text-[#ff1152]">
          Desenhe em tempo real com seus amigos
        </div>

        <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
          Uma tela.
          <br />
          Muitas ideias.
          <br />

          <span className="text-[#ff1152]">
            Juntos.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-base font-medium leading-7 text-white/50 md:text-lg">
          Crie uma sala, convide seus amigos e desenhem juntos em um mesmo
          espaço, em tempo real.
        </p>

        {user && (
          <div className="mt-10 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <Link
              href="/criar-sala"
              className="flex w-full items-center justify-center rounded-2xl bg-[#ff1152] px-8 py-4 text-base font-extrabold text-white shadow-[0_10px_40px_rgba(255,17,82,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ff2c64] active:translate-y-0"
            >
              Criar sala
            </Link>

            <Link
              href="/entrar-na-sala"
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-base font-extrabold text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
            >
              Entrar em uma sala
            </Link>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-white/30">
          <span className="h-2 w-2 rounded-full bg-[#ff1152]" />
          Salas com até 5 pessoas
        </div>

        <div className="mt-20 w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#101016] shadow-2xl shadow-black/50">
          <video
            className="aspect-video w-full object-cover"
            src="/videos/demo.mp4"
            poster="/images/demo-cover.webp"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8 text-center text-sm font-medium text-white/25">
        Box — desenhe junto.
      </footer>
    </main>
  );
}