import Friends from "../models/friends.models.js";
import User from "../models/user.js";
import Notification from "../models/Notification.js";

const FriendsController = {
  addFriends: async (req, res) => {
    try {
      const userId = req.user.id;
      const friendId = req.params.id;

      if (!friendId) {
        return res.status(400).json({
          message: "Friend id is required.",
        });
      }

      if (userId === friendId) {
        return res.status(400).json({
          message: "You cannot add yourself.",
        });
      }

      const [currentUser, friendUser] = await Promise.all([
        User.findById(userId),
        User.findById(friendId),
      ]);

      if (!currentUser || !friendUser) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      let senderDoc = await Friends.findOne({ userId });

      if (!senderDoc) {
        senderDoc = new Friends({
          userId,
          friends: [],
        });
      }

      let receiverDoc = await Friends.findOne({ userId: friendId });

      if (!receiverDoc) {
        receiverDoc = new Friends({
          userId: friendId,
          friends: [],
        });
      }

      const alreadyFriend = senderDoc.friends.some((friend) =>
        friend.friendId.equals(friendUser._id),
      );

      if (alreadyFriend) {
        return res.status(409).json({
          message: "Already friends.",
        });
      }

      senderDoc.friends.push({
        friendId: friendUser._id,
        friendUserName: friendUser.username,
      });

      receiverDoc.friends.push({
        friendId: currentUser._id,
        friendUserName: currentUser.username,
      });

      await senderDoc.save();
      await receiverDoc.save();

      // Create notification for the friend
      await Notification.create({
        userId: friendId,
        senderId: userId,
        message: `${currentUser.username} added you as a friend`,
        type: "friend",
        relatedId: userId,
      });

      res.status(201).json({
        success: true,
        message: "Friend added successfully.",
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: err.message,
      });
    }
  },

  AllFriends: async (req, res) => {
    try {
      const userId = req.user.id;

      const friendDoc = await Friends.findOne({ userId }).populate(
        "friends.friendId",
        "_id username profilePicture",
      );

      if (!friendDoc) {
        return res.json([]);
      }

      res.json(friendDoc.friends);
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: err.message,
      });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const userId = req.user.id;

      const friendDoc = await Friends.findOne({ userId });

      const friendIds = friendDoc
        ? friendDoc.friends.map((friend) => friend.friendId)
        : [];

      const users = await User.find({
        _id: {
          $ne: userId,
          $nin: friendIds,
        },
      }).select("_id username profilePicture");

      res.json(users);
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: err.message,
      });
    }
  },

  searchUsers: async (req, res) => {
    try {
      const userId = req.user.id;
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({
          message: "Username is required.",
        });
      }

      const friendDoc = await Friends.findOne({ userId });

      const friendIds = friendDoc
        ? friendDoc.friends.map((friend) => friend.friendId)
        : [];

      const users = await User.find({
        username: {
          $regex: username,
          $options: "i",
        },
        _id: {
          $ne: userId,
          $nin: friendIds,
        },
      }).select("_id username profilePicture");

      res.json(users);
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: err.message,
      });
    }
  },
};

export default FriendsController;
