"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const pronouns = String(formData.get("pronouns") ?? "").trim();

  if (!name) {
    redirect(
      `/perfil?error=${encodeURIComponent("O nome não pode ficar vazio.")}`,
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      name,
      pronouns,
    },
  });

  if (error) {
    redirect(
      `/perfil?error=${encodeURIComponent(
        "Não foi possível atualizar o perfil.",
      )}`,
    );
  }

  revalidatePath("/", "layout");

  redirect(
    `/perfil?message=${encodeURIComponent(
      "Perfil atualizado com sucesso.",
    )}`,
  );
}

export async function updateEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect(
      `/perfil?error=${encodeURIComponent("Informe um e-mail válido.")}`,
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  if (user.email === email) {
    redirect(
      `/perfil?error=${encodeURIComponent(
        "Esse já é o e-mail da sua conta.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({
    email,
  });

  if (error) {
    redirect(
      `/perfil?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/", "layout");

  redirect(
    `/perfil?message=${encodeURIComponent(
      "Alteração de e-mail solicitada. Verifique seu e-mail caso seja necessária uma confirmação.",
    )}`,
  );
}

export async function updatePassword(formData: FormData) {
  const currentPassword = String(
    formData.get("currentPassword") ?? "",
  );

  const newPassword = String(
    formData.get("newPassword") ?? "",
  );

  const confirmPassword = String(
    formData.get("confirmPassword") ?? "",
  );

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect(
      `/perfil?error=${encodeURIComponent(
        "Preencha todos os campos da senha.",
      )}`,
    );
  }

  if (newPassword.length < 8) {
    redirect(
      `/perfil?error=${encodeURIComponent(
        "A nova senha deve possuir pelo menos 8 caracteres.",
      )}`,
    );
  }

  if (newPassword !== confirmPassword) {
    redirect(
      `/perfil?error=${encodeURIComponent(
        "As novas senhas não coincidem.",
      )}`,
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/entrar");
  }

  const { error: authenticationError } =
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

  if (authenticationError) {
    redirect(
      `/perfil?error=${encodeURIComponent(
        "A senha atual está incorreta.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    redirect(
      `/perfil?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/perfil?message=${encodeURIComponent(
      "Senha alterada com sucesso.",
    )}`,
  );
}