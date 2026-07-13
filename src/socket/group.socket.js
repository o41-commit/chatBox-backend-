import Group from "../models/Group.js";
import GroupMessages from "../models/GroupMessages.js";

export const getGroupInfo = (socket, io) => {
  socket.on("get-group-info", async () => {
    try {
      const userId = socket.user?.id || socket.handshake?.auth?.userId; 
      if (!userId) return socket.emit("group-error", "Unauthorized access.");

      const groups = await Group.find({
        "users.userId": userId,
      })
        .populate({
          path: "lastMessage",
          select: "message sender senderUsername senderPics createdAt isReadBy",
        })
        .sort({ updatedAt: -1 });

      const groupList = await Promise.all(
        groups.map(async (group) => {
          const unreadCount = await GroupMessages.countDocuments({
            groupId: group._id,
            sender: { $ne: userId },
            "isReadBy.userId": { $ne: userId },
            deletedFor: { $ne: userId },
          });

          return {
            groupId: group._id,
            groupName: group.name,
            groupPics: group.groupPics,
            lastMessage: group.lastMessage
              ? {
                  message: group.lastMessage.message,
                  sender: group.lastMessage.sender,
                  senderUsername: group.lastMessage.senderUsername,
                  senderPics: group.lastMessage.senderPics,
                  createdAt: group.lastMessage.createdAt,
                }
              : null,
            unreadCount,
          };
        })
      );

      socket.emit("group-info", {
        success: true,
        groups: groupList,
      });
    } catch (error) {
      console.error("GET GROUP INFO ERROR:", error);
      socket.emit("group-info", {
        success: false,
        message: "Failed to load groups.",
      });
    }
  });
};