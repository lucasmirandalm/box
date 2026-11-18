import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth/actions";
import { requireAccountRole } from "@/lib/account/server";
import { accountRoleLabel } from "@/lib/account/roles";
import { GraduationCap, Presentation, Pencil, Users } from "lucide-react";

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await requireAccountRole(supabase, user.id) : null;
  const isTeacher = role === "teacher";

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
              {role && <span className="hidden rounded-lg bg-[#ff1152]/10 px-2 py-1 text-xs font-bold text-[#ff1152] sm:inline">{accountRoleLabel(role)}</span>}

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
                {role && <p className="mt-2 text-xs font-bold text-[#ff1152]">{accountRoleLabel(role)}</p>}
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
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff1152]/20 bg-[#ff1152]/10 px-4 py-2 text-sm font-bold text-[#ff1152]">
          {role ? (isTeacher ? <Presentation size={17} /> : <GraduationCap size={17} />) : <Pencil size={17} />}
          {role ? `Painel do ${isTeacher ? "professor" : "aluno"}` : "Ensino de desenho digital"}
        </div>

        <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
          {role ? (isTeacher ? "Ensine desenho." : "Aprenda desenho.") : "Desenho se aprende"}
          <br />
          <span className="text-[#ff1152]">
            {role ? (isTeacher ? "Oriente em tempo real." : "Pratique em conjunto.") : "em colaboração."}
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-base font-medium leading-7 text-white/50 md:text-lg">
          {role
            ? isTeacher
              ? "Crie uma aula, compartilhe o código com seus alunos e demonstre técnicas no quadro de desenho compartilhado."
              : "Entre em uma aula com o código do professor, acompanhe demonstrações e pratique desenho em um quadro compartilhado."
            : "Um ambiente de apoio ao ensino e à aprendizagem de desenho digital, com interação entre professores e alunos em tempo real."}
        </p>

        {error && <p role="alert" className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        {user && (
          <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
            {isTeacher && (
              <Link href="/criar-sala" className="group flex flex-col items-start gap-3 rounded-2xl bg-[#ff1152] p-5 text-left text-white shadow-[0_10px_40px_rgba(255,17,82,0.25)] transition hover:-translate-y-0.5 hover:bg-[#ff2c64]">
                <Presentation size={26} />
                <span className="text-lg font-extrabold">Criar aula</span>
                <span className="text-sm text-white/80">Abra uma sessão e convide seus alunos.</span>
              </Link>
            )}
            <Link href="/entrar-na-sala" className={`group flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${isTeacher ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]" : "border-[#ff1152]/30 bg-[#ff1152]/10 hover:bg-[#ff1152]/20 sm:col-span-2"}`}>
              <GraduationCap size={26} className="text-[#ff1152]" />
              <span className="text-lg font-extrabold">Entrar em uma aula</span>
              <span className="text-sm text-white/50">Use o código compartilhado pelo professor responsável.</span>
            </Link>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-white/40">
          <Users size={16} className="text-[#ff1152]" />
          Aulas com até 5 participantes
        </div>

        {!user && (
          <div className="mt-12 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <Presentation size={24} className="mb-3 text-[#ff1152]" />
              <h2 className="font-extrabold">Para professores</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">Crie aulas e oriente seus alunos desenhando junto com eles.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <GraduationCap size={24} className="mb-3 text-[#ff1152]" />
              <h2 className="font-extrabold">Para alunos</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">Acompanhe explicações, pratique técnicas e receba orientações no quadro compartilhado.</p>
            </div>
          </div>
        )}

        <div className="mt-20 w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#101016] shadow-2xl shadow-black/50">
          <video
            className="aspect-video w-full object-cover"
            src="/videos/demo.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] px-6 py-8 text-center text-sm font-medium text-white/25">
        Box — ambiente colaborativo de apoio ao ensino de desenho digital.
      </footer>
    </main>
  );
}