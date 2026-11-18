"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAccountRole } from "@/lib/account/roles";
import { getAccountRole } from "@/lib/account/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(
      `/entrar?error=${encodeURIComponent("Preencha todos os campos.")}`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/entrar?error=${encodeURIComponent("E-mail ou senha inválidos.")}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function register(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const role = formData.get("role");

  if (!isAccountRole(role)) {
    redirect(`/criar-conta?error=${encodeURIComponent("Selecione Professor ou Aluno.")}`);
  }

  if (!name || !email || !password || !confirmPassword) {
    redirect(
      `/criar-conta?error=${encodeURIComponent(
        "Preencha todos os campos.",
      )}`,
    );
  }

  if (password.length < 8) {
    redirect(
      `/criar-conta?error=${encodeURIComponent(
        "A senha deve possuir pelo menos 8 caracteres.",
      )}`,
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/criar-conta?error=${encodeURIComponent(
        "As senhas não coincidem.",
      )}`,
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        box_role: role,
      },
    },
  });

  if (error) {
    console.error("Supabase sign up error:", error);

    redirect(
      `/criar-conta?error=${encodeURIComponent(error.message)}`,
    );
  }

  if (!data.session) {
    redirect(
      `/entrar?message=${encodeURIComponent(
        "Conta criada. Verifique seu e-mail para confirmar o cadastro.",
      )}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function chooseAccountRole(formData: FormData) {
  const role = formData.get("role");
  if (!isAccountRole(role)) {
    redirect(`/definir-perfil?error=${encodeURIComponent("Selecione um tipo de conta.")}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (await getAccountRole(supabase, user.id)) redirect("/");

  const { error } = await supabase.rpc("box_choose_account_role", { p_role: role });
  if (error) {
    if (error.message.includes("ACCOUNT_ROLE_ALREADY_DEFINED")) redirect("/");
    console.error("Account role selection failed:", error);
    redirect(`/definir-perfil?error=${encodeURIComponent("Não foi possível definir o perfil. Tente novamente.")}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut({
    scope: "local",
  });

  revalidatePath("/", "layout");
  redirect("/");
}
