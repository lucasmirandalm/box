"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut({
    scope: "local",
  });

  revalidatePath("/", "layout");
  redirect("/");
}