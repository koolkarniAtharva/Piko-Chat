import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";
import FriendCard from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";
import { useEffect, useState } from "react";
import useAuthUser from "../hooks/useAuthUser";

let StreamChat;
try {
  // Dynamically require to avoid breaking if not installed
  StreamChat = require("stream-chat").StreamChat;
} catch (e) {
  StreamChat = null;
}

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const FriendsPage = () => {
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });
  const { authUser } = useAuthUser();
  const [unreadMap, setUnreadMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function fetchUnread() {
      if (!StreamChat || !authUser || !STREAM_API_KEY) return;
      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);
        // You may need to get the token as in ChatPage
        const tokenResp = await fetch("/api/chat/token");
        const { token } = await tokenResp.json();
        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          token
        );
        // Query all 1-on-1 channels
        const filter = { type: "messaging", members: { $in: [authUser._id] }, member_count: 2 };
        const sort = [{ last_message_at: -1 }];
        const channels = await client.queryChannels(filter, sort, { state: true });
        const map = {};
        channels.forEach((ch) => {
          // Find the other member
          const other = ch.state.members.find((m) => m.user.id !== authUser._id);
          if (other) {
            map[other.user.id] = ch.countUnread();
          }
        });
        if (isMounted) setUnreadMap(map);
        await client.disconnectUser();
      } catch (e) {
        // Fail gracefully
        if (isMounted) setUnreadMap({});
      }
    }
    fetchUnread();
    return () => { isMounted = false; };
  }, [authUser]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-10">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Your Friends</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : friends.length === 0 ? (
          <NoFriendsFound />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {friends.map((friend) => (
              <FriendCard key={friend._id} friend={friend} hasUnread={!!unreadMap[friend._id]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage; 