import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RoomEditor from "@/components/room/room-editor";

type RoomPageProps = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function RoomPage({
  params,
}: RoomPageProps) {
  const { roomCode } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
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
      roomCode={roomCode}
      userName={userName}
      avatarUrl={avatarUrl}
    />
  );
}