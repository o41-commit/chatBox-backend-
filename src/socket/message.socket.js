import Messages from "../controllers/message.controller.js";
import Message from "../models/Message.js";

export const registerMessageEvent = (socket, io, onlineUsers) => {
  socket.on("send-message", async (data) => {
    try {
      const reciver = data.reciver;
      // console.log("receiver details:", reciver);

      // Create the core message document
      const newMessageDoc = await Message.create({
        sender: socket.user.id,
        reciver: reciver,
        message: data.message,
      });

      // Populate sender profile picture details before emitting out
      const message = await Message.findById(newMessageDoc._id)
        .populate("sender", "username profilePicture")
        .populate("reciver", "username profilePicture");

      const reciverSocket = onlineUsers.get(data.reciver);

      if (reciverSocket) {
        io.to(reciverSocket).emit("receive-message", message);
      }

      socket.emit("message-sent", message);
    } catch (error) {
      console.error("this is the error ", error);
      socket.emit("message-error", {
        message: "unable to send message ",
      });
    }
  });
};