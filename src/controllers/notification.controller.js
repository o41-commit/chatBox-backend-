import Notification from "../models/Notification.js";
import user from "../models/user.js";

const NotificationController = {
  getNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      // console.log("Logged in user:", req.user.id);

      const notifications = await Notification.find({ userId })
        .populate("senderId", "username profilePicture")
        .sort({ createdAt: -1 });

      if (!notifications) {
        return res.status(404).json({ message: "No notifications found" });
      }

      // console.log(
      //   notifications.map((n) => ({
      //     userId: n.userId.toString(),
      //     message: n.message,
      //   })),
      // );

      return res.status(200).json({
        message: "Notifications retrieved successfully",
        notifications,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const { notificationId } = req.body;
      const userId = req.user.id;
      // console.log(req.body)

      if (!notificationId) {
        return res.status(400).json({ message: "Notification ID is required" });
      }

      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify the notification belongs to the user
      if (notification.userId.toString() !== userId) {
        return res.status(403).json({
          message: "Unauthorized access to this notification",
        });
      }

      const updatedNotification = await Notification.findByIdAndUpdate(
        notificationId,
        { isRead: true },
        { new: true },
      );

      return res.status(200).json({
        message: "Notification marked as read",
        notification: updatedNotification,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  deleteNotification: async (req, res) => {
    try {
      const { notificationId } = req.body;
      const userId = req.user.id;
      // console.log(req.body)

      if (!notificationId) {
        return res.status(400).json({ message: "Notification ID is required" });
      }

      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Verify the notification belongs to the user
      if (notification.userId.toString() !== userId) {
        return res.status(403).json({
          message: "Unauthorized access to this notification",
        });
      }

      await Notification.findByIdAndDelete(notificationId);

      return res.status(200).json({
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("error message:", error)
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },
};

export default NotificationController;
