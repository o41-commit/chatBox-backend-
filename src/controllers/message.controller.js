import Message from "../models/Message.js";

const Messages = {
  // Get conversation between logged-in user and another user
  getMessage: async (req, res) => {
    try {
      const user = req.user.id;
      const { userId } = req.params;
      console.log("reciver id", userId);

      const messages = await Message.find({
        $or: [
          {
            sender: user,
            reciver: userId,
          },
          {
            sender: userId,
            reciver: user,
          },
        ],
      })
        .sort({ createdAt: 1 })
        .populate("sender", "username profilePicture")
        .populate("reciver", "username profilePicture");

      const formattedMessages = messages.map((msg) => {
        const message = msg.toObject();

        if (
          message.deletedFor.some((id) => id.toString() === user.toString())
        ) {
          message.message = "This message has been deleted.";
        }

        return message;
      });

      return res.status(200).json({
        success: true,
        messages: formattedMessages,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch messages.",
      });
    }
  },

  // Delete message for the logged-in user
  deleteMessage: async (req, res) => {
    try {
      const user = req.user.id;
      const { messageId } = req.params;

      const message = await Message.findById(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found.",
        });
      }

      // Only sender or receiver can delete
      const isOwner =
        message.sender.toString() === user ||
        message.reciver.toString() === user;
      console.log(isOwner, "that is the log");

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      if (!message.deletedFor.some((id) => id.toString() === user.toString())) {
        message.deletedFor.push(user);
        await message.save();
      }

      return res.status(200).json({
        success: true,
        message: "Message deleted successfully.",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete message.",
      });
    }
  },

  // Read message
  readMessage: async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    try {
      if (!friendId) {
        return res.status(400).json({
          success: false,
          message: "Friend ID is required.",
        });
      }

      const result = await Message.updateMany(
        {
          sender: friendId,
          reciver: userId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

      return res.status(200).json({
        success: true,
        message: `${result.modifiedCount} message(s) marked as read.`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("READ MESSAGE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to mark messages as read.",
      });
    }
  },
};

export default Messages;
