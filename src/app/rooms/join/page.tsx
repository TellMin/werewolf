import GuestJoinRoomScreen from "@/lib/room/components/GuestJoinRoomScreen";

type JoinPageProps = {
  searchParams: Promise<{
    roomId?: string | string[];
  }>;
};

export default async function JoinRoomPage({ searchParams }: JoinPageProps) {
  // searchParams を await する
  const params = await searchParams;
  const roomIdParam = params?.roomId;
  const initialRoomId = Array.isArray(roomIdParam) ? roomIdParam[0] : (roomIdParam ?? null);

  return <GuestJoinRoomScreen initialRoomId={initialRoomId} />;
}
