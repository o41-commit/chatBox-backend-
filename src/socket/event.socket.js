import User from "../models/user.js";
import Message from "../models/Message.js";
import GroupMessage from "../models/GroupMessages.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

export const messageEvent = (socket, io, onlineUser) => {
  socket.on("typing", async (data) => {
    // console.log("typing event received from client:", data);
    try {
      const userId = socket.user.id;
      const client = data.client;
      const findUser = await User.findById(userId).select(
        "username profilePicture",
      );
      const findClientOnline = onlineUser.get(client);
      if (findClientOnline) {
        io.to(findClientOnline).emit("typing", {
          userId,
          message: "Typing",
          findUser,
        });
      }
    } catch (error) {
      console.error("this is the error", error);
      socket.emit("error", "error when sending when typing ");
    }
  });

  socket.on("stop-typing", (data) => {
    try {
      const client = data.client;

      const receiverSocketId = onlineUser.get(client);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop-typing");
      }
    } catch (error) {
      console.error(error);
    }
  });
};

export const chatUserEvent = (socket) => {
  // console.log("socket.user:", socket.user);
  socket.on("get-chat-user", async (data) => {
    // console.log("Event fired");
    // console.log(data);
    try {
      const { userId: receiverId } = data;
      // console.log(data, "this is what i see ");
      const senderId = socket.user.id;

      const [sender, receiver] = await Promise.all([
        User.findById(senderId).select(
          "username profilePicture isOnline lastSeen",
        ),
        User.findById(receiverId).select(
          "username profilePicture isOnline lastSeen",
        ),
      ]);

      // console.log(sender, receiver, "this is what i see ");

      if (!sender || !receiver) {
        return socket.emit("chat-user-error", {
          message: "User not found",
        });
      }

      socket.emit("chat-user", {
        sender: {
          userId: sender._id,
          username: sender.username,
          profilePicture: sender.profilePicture,
          isOnline: sender.isOnline,
          lastSeen: sender.lastSeen,
        },

        receiver: {
          userId: receiver._id,
          username: receiver.username,
          profilePicture: receiver.profilePicture,
          isOnline: receiver.isOnline,
          lastSeen: receiver.lastSeen,
        },
      });
    } catch (error) {
      console.error(error);

      socket.emit("chat-user-error", {
        message: "Failed to fetch chat users.",
      });
    }
  });
};


// Reusable calculation engine
export const emitUpdatedBadges = async (userId, socket, io) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [unreadDMs, unreadGroups, unreadNotifications] = await Promise.all([
      Message.exists({ reciver: userObjectId, isRead: false }),
      GroupMessage.exists({
        sender: { $ne: userObjectId },
        deletedFor: { $ne: userObjectId },
        "isReadBy.userId": { $ne: userObjectId }
      }),
      Notification.exists({ userId: userObjectId, isRead: false })
    ]);

    socket.emit("badge-status", {
      hasUnreadChats: !!(unreadDMs || unreadGroups),
      hasUnreadNotifications: !!unreadNotifications,
    });
  } catch (error) {
    console.error("Error updating badges:", error);
  }
};

export const getBadgeStatus = (socket, io) => {
  const authId = socket.user?.id || socket.handshake?.auth?.userId;
  if (!authId) return;

  // 1. Initial load fetch
  socket.on("get-badge-status", async () => {
    await emitUpdatedBadges(authId, socket, io);
  });

  // 2. TRIGGERED WHEN "CHATS" IS CLICKED
  socket.on("navbar-click-chats", async () => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(authId);
      
      // Mark all direct messages to this user as read
      await Message.updateMany(
        { reciver: userObjectId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      // (Optional) If you want to automatically mark group messages as read here too:
      // Note: Usually group messages are marked read when opening the specific group chat room,
      // but if you want them cleared from the badge instantly, you'd push the userId into 'isReadBy'.

      // Recalculate and reply immediately
      await emitUpdatedBadges(authId, socket, io);
    } catch (err) {
      console.error(err);
    }
  });

  // 3. TRIGGERED WHEN "NOTIFICATIONS" IS CLICKED
  socket.on("navbar-click-notifications", async () => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(authId);

      // Mark all user notifications as read instantly
      await Notification.updateMany(
        { userId: userObjectId, isRead: false },
        { $set: { isRead: true } }
      );

      // Recalculate and reply immediately
      await emitUpdatedBadges(authId, socket, io);
    } catch (err) {
      console.error(err);
    }
  });
};
