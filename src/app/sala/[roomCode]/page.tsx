import { redirect } from "next/navigation";

import RoomEditor from "@/components/room/room-editor";
import { createClient } from "@/lib/supabase/server";
import { requireAccountRole } from "@/lib/account/server";
import { parseClassroomRoles } from "@/lib/account/roles";

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

  const role = await requireAccountRole(supabase, user.id);

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
        "Você não pertence a essa aula ou ela não existe.",
      )}`,
    );
  }

  const { data: classroomRoles, error: classroomRolesError } = await supabase.rpc(
    "box_classroom_roles",
    { p_room_code: room.code },
  );

  if (classroomRolesError) {
    console.error("Classroom role lookup failed:", classroomRolesError);
    redirect(`/entrar-na-sala?error=${encodeURIComponent("Não foi possível verificar a aula.")}`);
  }

  // Legacy rooms remain accessible until their existing expiration; they do
  // not acquire teacher permissions unless their owner has chosen that role.
  const participantRoles = parseClassroomRoles(classroomRoles);
  const teacherId = participantRoles[room.owner_id] === "teacher" ? room.owner_id : null;

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
      key={room.id}
      roomCode={room.code}
      roomName={room.name}
      teacherId={teacherId}
      accountRole={role}
      initialParticipantRoles={participantRoles}
      userId={user.id}
      userName={userName}
      avatarUrl={avatarUrl}
    />
  );
}