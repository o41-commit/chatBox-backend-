import GroupMessages from "../models/GroupMessages.js"; // Ensure this matches your filename exactly
import Group from "../models/Group.js";
import User from "../models/user.js";

export const groupTypingEvent = (socket, io) => {
  socket.on("group-typing", async (data) => {
    try {
      const { groupId } = data;

      socket.to(groupId).emit("group-user-typing", {
        groupId,
        userId: socket.user.id,
        username: socket.user.userName,
      });
      // console.log(socket.user.username, socket.user.id);
    } catch (err) {
      console.error("Group typing hook error:", err);
    }
  });

  socket.on("group-stop-typing", async (data) => {
    try {
      const { groupId } = data;
      socket.to(groupId).emit("group-user-stop-typing", {
        groupId,
        userId: socket.user.id,
      });
    } catch (err) {
      console.error("Group stop-typing hook error:", err);
    }
  });
};

export const sendGroupMessage = (socket, io) => {
  socket.on("send-group-message", async (data) => {
    try {
      const { groupId, message } = data;
      const userId = socket.user.id;

      // Fetch sender information
      const userData = await User.findById(userId).select(
        "username profilePicture",
      );
      if (!userData) return;

      const group = await Group.findById(groupId);
      if (!group) return;

      // FIXED: Safeguard senderPics with a fallback to satisfy schema's "required: true" constraint
      const newMessage = await GroupMessages.create({
        groupId,
        sender: userId,
        senderUsername: userData.username,
        senderPics: userData.profilePicture || "",
        message: message.trim(),
      });

      // Update the group's last message reference tracking
      group.lastMessage = newMessage._id;
      await group.save();

      // Broadcast structural payload that cleanly mirrors your client-side variables
      io.to(groupId).emit("receive-group-message", {
        _id: newMessage._id,
        groupId,
        sender: {
          _id: userId,
          username: userData.username,
          profilePicture: userData.profilePicture || "",
        },
        senderUsername: newMessage.senderUsername,
        senderPics: newMessage.senderPics,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
      });
    } catch (err) {
      console.error("Send group message error:", err);
    }
  });
};

export const groupOnlineMembers = (socket, io, onlineUsers) => {
  socket.on("group-online-users", async ({ groupId }) => {
    try {
      const group = await Group.findById(groupId);
      if (!group) return;

      // Safely filters users online matching schema nested fields
      const online = group.users.filter((member) =>
        onlineUsers.has(
          member.userId ? member.userId.toString() : member.toString(),
        ),
      );

      io.to(groupId).emit("group-online-count", {
        groupId,
        onlineUsers: online.length,
      });
    } catch (err) {
      console.error("Group online users check error:", err);
    }
  });
};

export const leaveGroup = (socket, io) => {
  socket.on("leave-group", async ({ groupId }) => {
    try {
      const userId = socket.user.id;
      const group = await Group.findById(groupId);
      if (!group) return;

      // Pull user records cleanly based on dynamic field structures
      group.users = group.users.filter(
        (user) =>
          (user.userId ? user.userId.toString() : user.toString()) !== userId,
      );

      await group.save();
      socket.leave(groupId);

      io.to(groupId).emit("group-member-left", {
        groupId,
        userId,
        username: socket.user.username,
        message: `${socket.user.username} left the group`,
      });
    } catch (err) {
      console.error("Leave group controller error:", err);
    }
  });
};

export const joinGroupRoom = (socket) => {
  socket.on("join-group", ({ groupId }) => {
    socket.join(groupId);
    console.log("group joined with the id of ", groupId);
  });
};
