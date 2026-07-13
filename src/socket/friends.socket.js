import Friend from "../models/friends.models.js";
import User from "../models/user.js";

export const sendFriendStatus = async (socket, userId) => {
     const friendDocument = await Friend.findOne({ userId });

  if (!friendDocument) {
    socket.emit("friends-status", []);
    return;
  }

  const friendIds = friendDocument.friends.map((f) => f.friendId);

  const users = await User.find({
    _id: { $in: friendIds },
  }).select("username profilePicture isOnline");

  const friendsStatus = users.map((friend) => ({
    userId: friend._id,
    userName: friend.username,
    profilePicture: friend.profilePicture,
    active: friend.isOnline,
  }));

  socket.emit("friends-status", friendsStatus);
}

 export const updateAllFriendStatuses = async (onlineUsers, io) => {
      for (const [userId, socketId] of onlineUsers.entries()) {
    const socket = io.sockets.sockets.get(socketId);
    // console.log(onlineUsers)

    if (!socket) continue;

    await sendFriendStatus(socket, userId);
  }
}