import { Server } from "socket.io";
import User from "../models/user.js";
import { getGroupInfo } from "./group.socket.js";
import {
  leaveGroup,
  joinGroupRoom,
  groupOnlineMembers,
  groupTypingEvent,
  sendGroupMessage,
} from "./groupMessage.socket.js";
import { getChatInfo } from "./chat.socket.js";
import { authenticateSocket } from "./auth.socket.js";
import { messageEvent, chatUserEvent, getBadgeStatus } from "./event.socket.js";
import { sendFriendStatus, updateAllFriendStatuses } from "./friends.socket.js"; // Note: Retained your exact filename spelling "freinds"
import { registerMessageEvent } from "./message.socket.js";
// import { registerGroupEvent } from "./group.socket.js";
// import { registerGroupMessageEvent } from "./groupMessage.socket.js";

// ... keeping your existing imports

let io;
const onlineUsers = new Map();

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    try {
      // REGISTER EVENTS FIRST
      getBadgeStatus(socket, io);
      chatUserEvent(socket);
      registerMessageEvent(socket, io, onlineUsers);
      messageEvent(socket, io, onlineUsers);
      getChatInfo(socket, io);
      getGroupInfo(socket, io);
      joinGroupRoom(socket);
      groupTypingEvent(socket, io);
      sendGroupMessage(socket, io);
      groupOnlineMembers(socket, io, onlineUsers);
      leaveGroup(socket, io);

      // Find user
      const currentUser = await User.findOneAndUpdate(
        { username: socket.user.userName },
        {
          isOnline: true,
          lastSeen: null,
        },
        { new: true }
      );

      if (!currentUser) {
        console.log("User not found");
        return socket.disconnect(true);
      }

      const userId = currentUser._id.toString();
      onlineUsers.set(userId, socket.id);

      // --- NEW: Emit user data including profile pic to this specific client ---
      socket.emit("user_authenticated", {
        profilePic: currentUser.profilePicture || "", // Fallback if no picture exists
      });

      await sendFriendStatus(socket, currentUser._id);
      await updateAllFriendStatuses(onlineUsers, io);

      socket.on("disconnect", async () => {
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          onlineUsers.delete(userId);
          await updateAllFriendStatuses(onlineUsers, io);
        } catch (err) {
          console.error("Disconnect Error:", err);
        }
      });
    } catch (err) {
      console.error("Socket Connection Error:", err);
    }
  });
};

export const getIO = () => io;