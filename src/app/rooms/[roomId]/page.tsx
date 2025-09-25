import { HostWaitingRoomScreen } from "@/lib/room/components/HostWaitingRoomScreen";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    hostToken?: string | string[];
  }>;
};

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const hostTokenParam = resolvedSearchParams?.hostToken;
  const initialHostToken = Array.isArray(hostTokenParam)
    ? hostTokenParam[0]
    : (hostTokenParam ?? undefined);

  return (
    <HostWaitingRoomScreen roomId={resolvedParams.roomId} initialHostToken={initialHostToken} />
  );
}
