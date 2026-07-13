import express from "express";

import LoginController from "../controllers/login.controller.js";
import { active } from "../controllers/active.controller.js";
import verifyToken from "../middleware/user.middleware.js";
import FriendsController from "../controllers/Friends.controller.js";
import Settings from "../controllers/Setting.controller.js";
import upload from "../middleware/Upload.middleware.js";
import Profile from "../controllers/Profile.controller.js";
import GroupController from "../controllers/Group.controller.js";
import NotificationController from "../controllers/notification.controller.js";
import Messages from "../controllers/message.controller.js";
const router = express.Router();

router.post(
  "/read-message",
  (req, res, next) => {
    // console.log("Route reached");
    next();
  },
  verifyToken,
  Messages.readMessage,
);

// Auth Routes
router.post("/login", LoginController.login);
router.post("/register", LoginController.register);

// Active User Route
router.get("/active", verifyToken, active);

// Friends Routes
router.get("/friends", verifyToken, FriendsController.AllFriends);
router.post("/addFriend/:id", verifyToken, FriendsController.addFriends);
router.get("/searchFriend", verifyToken, FriendsController.searchUsers);
router.get("/allUser", verifyToken, FriendsController.getAllUsers);

// Profile Routes
router.get("/user/:id", Profile.getUserProfile);
router.get("/profile", verifyToken, Profile.getProfile);

// SETTINGS ROUTES
router.post(
  "/uploadProfilePicture",
  verifyToken,
  upload.single("profilePicture"),
  Settings.UploadProfilePicture,
);
router.put("/changeTheme", verifyToken, Settings.ChangeTheme);
router.post("/changeInfo", verifyToken, Settings.ChangeInfo);
router.post("/changePassword", verifyToken, Settings.ChangePassword);

// Group Routes
router.post(
  "/createGroup",
  verifyToken,
  upload.single("profilePicture"),
  GroupController.createGroup,
);
router.post("/addMember", verifyToken, GroupController.addMember);
router.post("/joinPublicGroup", verifyToken, GroupController.joinPublicGroup);
router.put(
  "/updateGroup/:id",
  verifyToken,
  upload.single("groupPics"),
  GroupController.updateGroup,
);
router.post("/removeMember", verifyToken, GroupController.removeMember);
router.delete(
  "/deleteGroup/:groupId",
  verifyToken,
  GroupController.deleteGroup,
);
router.post("/leaveGroup", verifyToken, GroupController.leaveGroup);
router.get("/groups", verifyToken, GroupController.getAllGroups);
router.get("/group/:groupId", verifyToken, GroupController.getGroupById);
router.get("/publicGroups", GroupController.getPublicGroups);
router.get(
  "/group/message/:groupId",
  verifyToken,
  GroupController.getGroupMessage,
);
router.post(
  "/group/messages/read",
  verifyToken,
  GroupController.readGroupMessage
);

// Notification Routes
router.get(
  "/notifications",
  verifyToken,
  NotificationController.getNotifications,
);
router.put("/markAsRead", verifyToken, NotificationController.markAsRead);
router.delete(
  "/deleteNotification",
  verifyToken,
  NotificationController.deleteNotification,
);

// MESSAGES ROUTE
router.get("/messages/:userId", verifyToken, Messages.getMessage);
router.delete("/messages/:messageId", verifyToken, Messages.deleteMessage);

export default router;
