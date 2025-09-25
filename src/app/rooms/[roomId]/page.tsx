import { HostWaitingRoomScreen } from "@/lib/room/components/HostWaitingRoomScreen";

type RoomPageProps = {
  params: {
    roomId: string;
  };
  searchParams?: {
    hostToken?: string | string[];
  };
};

export default function RoomPage({ params, searchParams }: RoomPageProps) {
  const hostTokenParam = searchParams?.hostToken;
  const initialHostToken = Array.isArray(hostTokenParam) ? hostTokenParam[0] : hostTokenParam;

  return <HostWaitingRoomScreen roomId={params.roomId} initialHostToken={initialHostToken} />;
}
