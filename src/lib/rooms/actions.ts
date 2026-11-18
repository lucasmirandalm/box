"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAccountRole } from "@/lib/account/server";

function getRoomErrorMessage(message: string) {
  if (message.includes("TEACHER_ONLY") || message.includes("ROOM_OWNER_MISMATCH")) {
    return "Somente professores podem criar aulas.";
  }

  if (message.includes("ROOM_NOT_FOUND")) {
    return "Aula não encontrada.";
  }

  if (message.includes("ROOM_FULL")) {
    return "Essa aula já está cheia.";
  }

  if (message.includes("INVALID_ROOM_CODE")) {
    return "Código da aula inválido.";
  }

  if (message.includes("INVALID_ROOM_NAME")) {
    return "Nome da aula inválido.";
  }

  if (message.includes("NOT_AUTHENTICATED")) {
    return "Você precisa estar conectado.";
  }

  if (message.includes("COULD_NOT_GENERATE_ROOM_CODE")) {
    return "Não foi possível gerar o código da aula.";
  }

  return "Ocorreu um erro. Tente novamente.";
}

export async function createRoom(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const role = await requireAccountRole(supabase, user.id);
  if (role !== "teacher") {
    redirect(`/entrar-na-sala?error=${encodeURIComponent("Somente professores podem criar aulas.")}`);
  }

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  if (!name) {
    redirect(
      `/criar-sala?error=${encodeURIComponent(
        "Digite um nome para a aula.",
      )}`,
    );
  }

  if (name.length > 60) {
    redirect(
      `/criar-sala?error=${encodeURIComponent(
        "O nome da aula pode ter no máximo 60 caracteres.",
      )}`,
    );
  }

  const { data, error } = await supabase.rpc(
    "create_room",
    {
      p_name: name,
    },
  );

  if (error || !data) {
    const message = getRoomErrorMessage(
      error?.message ?? "",
    );

    redirect(
      `/criar-sala?error=${encodeURIComponent(
        message,
      )}`,
    );
  }

  redirect(
    `/sala/${String(data).toUpperCase()}`,
  );
}

export async function joinRoom(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  await requireAccountRole(supabase, user.id);

  const code = String(
    formData.get("code") ?? "",
  )
    .trim()
    .toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    redirect(
      `/entrar-na-sala?error=${encodeURIComponent(
        "Digite um código válido de 6 caracteres.",
      )}`,
    );
  }

  const { data, error } = await supabase.rpc(
    "join_room",
    {
      p_code: code,
    },
  );

  if (error || !data) {
    const message = getRoomErrorMessage(
      error?.message ?? "",
    );

    redirect(
      `/entrar-na-sala?error=${encodeURIComponent(
        message,
      )}`,
    );
  }

  redirect(
    `/sala/${String(data).toUpperCase()}`,
  );
}