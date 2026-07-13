import Message from "../models/Message.js";
import User from "../models/user.js";
import mongoose from "mongoose"; // <-- 1. MUST IMPORT MONGOOSE

export const getChatInfo = (socket, io) => {
  socket.on("get-chat-info", async () => {
    try {
      const authId = socket.user?.id || socket.handshake?.auth?.userId;
      if (!authId) return socket.emit("chat-error", "Unauthorized access.");

      // 2. CONVERT THE STRING TO A REAL MONGOOSE OBJECTID FOR AGGREGATION
      const userId = new mongoose.Types.ObjectId(authId);

    //   console.log(userId, "Casted ObjectId from getChatInfo");

      // 3. Find all unique users this user has exchanged messages with
      const activeChats = await Message.aggregate([
        {
          $match: {
            $or: [{ sender: userId }, { reciver: userId }],
            deletedFor: { $ne: userId }
          }
        },
        {
          $sort: { createdAt: -1 } 
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$sender", userId] },
                "$reciver",
                "$sender"
              ]
            },
            lastMessage: { $first: "$$ROOT" } 
          }
        }
      ]);

      // 4. Format the payload with user details and unread counts
      const chatList = await Promise.all(
        activeChats.map(async (chat) => {
          const partnerId = chat._id;

          // Fetch the chat partner's info
          const partnerInfo = await User.findById(partnerId).select(
            "username name profilePicture isOnline"
          );

          if (!partnerInfo) return null; 

          // Count unread messages (Normal Mongoose helper automatically handles string IDs)
          const unreadCount = await Message.countDocuments({
            sender: partnerId,
            reciver: authId, // Can keep as string string or use userId object
            isRead: false,
          });

          return {
            chatId: partnerId,
            username: partnerInfo.username,
            name: partnerInfo.name,
            profilePicture: partnerInfo.profilePicture || "",
            isOnline: partnerInfo.isOnline,
            lastMessage: {
              message: chat.lastMessage.message,
              sender: chat.lastMessage.sender,
              reciver: chat.lastMessage.reciver,
              createdAt: chat.lastMessage.createdAt,
              isRead: chat.lastMessage.isRead,
            },
            unreadCount,
          };
        })
      );

      const cleanChatList = chatList.filter((chat) => chat !== null);

      socket.emit("chat-info", {
        success: true,
        chats: cleanChatList,
      });

    //   console.log(cleanChatList, "cleanChatList from getChatInfo");

    } catch (error) {
      console.error("GET CHAT INFO ERROR:", error);
      socket.emit("chat-info", {
        success: false,
        message: "Failed to load chats.",
      });
    }
  });
};