import { redirect } from "next/navigation";

import RoomEditor from "@/components/room/room-editor";
import { createClient } from "@/lib/supabase/server";

type RoomPageProps = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function RoomPage({
  params,
}: RoomPageProps) {
  const { roomCode } = await params;

  const normalizedRoomCode = roomCode
    .trim()
    .toUpperCase();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const {
    data: room,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select(
      `
        id,
        code,
        name,
        owner_id,
        max_participants,
        created_at
      `,
    )
    .eq("code", normalizedRoomCode)
    .maybeSingle();

  if (roomError || !room) {
    redirect(
      `/entrar-na-sala?error=${encodeURIComponent(
        "Você não pertence a essa sala ou ela não existe.",
      )}`,
    );
  }

  const userName =
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Usuário";

  const avatarUrl =
    user.user_metadata?.avatar_url ??
    user.user_metadata?.picture ??
    null;

  return (
    <RoomEditor
      roomCode={room.code}
      userId={user.id}
      userName={userName}
      avatarUrl={avatarUrl}
    />
  );
}