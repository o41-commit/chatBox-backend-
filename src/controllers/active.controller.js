import { getIO } from "../socket/socket.js";
import Friend from "../models/friends.models.js";

export const active = async (req, res) => {
  const io = getIO();

  io.on("connection", async (socket) => {
    const userId = socket.userId; 
    console.log("User connected:", userId, "Socket ID:", socket.id);

    onlineUsers.set(userId, socket.id);

    const friends = await Friend.find({
      user: userId,
    }).populate("friends.friend", "_id username");

    const friendStatus = friends.map((friend) => ({
      friendId: friend.friend._id,
      username: friend.friend.username,
      active: onlineUsers.has(friend.friend._id.toString()),
    }));

    socket.emit("friends-status", friendStatus);
  });
};
