import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAccountRole, type AccountRole } from "./roles";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getAccountRole(
  supabase: ServerClient,
  userId: string,
): Promise<AccountRole | null> {
  const { data, error } = await supabase
    .from("box_account_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Account role lookup failed:", error);
    throw new Error("Não foi possível consultar o perfil. Verifique a migração de permissões do BOX.");
  }

  return isAccountRole(data?.role) ? data.role : null;
}

export async function requireAccountRole(
  supabase: ServerClient,
  userId: string,
): Promise<AccountRole> {
  const role = await getAccountRole(supabase, userId);
  if (!role) redirect("/definir-perfil");
  return role;
}
