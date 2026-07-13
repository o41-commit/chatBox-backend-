import Group from "../models/Group.js";
import GroupMessages from "../models/GroupMessages.js";
import { getIO } from "../socket/socket.js";
import user from "../models/user.js";
import Notification from "../models/Notification.js";

const GroupController = {
  createGroup: async (req, res) => {
    const UserId = req.user.id;
    const { name, description, groupType } = req.body;
    const groupPics = req.file;

    try {
      const findUser = await user.findById(UserId);

      if (!findUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!name || !description || !groupType) {
        return res.status(400).json({
          message: "Please fill in all required fields.",
        });
      }

      const newGroup = await Group.create({
        name,
        description,
        groupPics: groupPics?.path || "",
        type: groupType,
        createdBy: findUser.id,
        users: [
          {
            userId: UserId,
            userType: "admin",
            userName: findUser.username,
          },
        ],
      });

      await Notification.create({
        userId: UserId,
        senderId: UserId,
        message: `You created group "${name}" successfully`,
        type: "group",
        relatedId: newGroup._id,
      });

      return res.status(201).json({
        message: "Group created successfully",
        group: newGroup,
      });
    } catch (error) {
      console.error("CREATE GROUP ERROR:", error);

      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  addMember: async (req, res) => {
    // 1. Change memberId to memberIds (expecting an array now)
    const { memberIds, groupId } = req.body;
    const userId = req.user.id;

    try {
      // Validate that memberIds is provided and is an array
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res
          .status(400)
          .json({ message: "memberIds must be a non-empty array" });
      }

      const findUser = await user.findById(userId);
      if (!findUser) {
        return res.status(404).json({ message: "Admin user not found" });
      }

      const findGroup = await Group.findById(groupId);
      if (!findGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if current user is admin
      const isAdmin = findGroup.users.some(
        (u) => u.userId.toString() === userId && u.userType === "admin",
      );

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can add members" });
      }

      // Create a Set of existing user IDs in the group (converted to strings for exact matching)
      const existingUserIds = new Set(
        findGroup.users.map((u) => u.userId.toString()),
      );

      // Filter out users who are already in the group
      const newMemberIds = memberIds.filter(
        (id) => !existingUserIds.has(id.toString()),
      );

      // If all selected users are already in the group, stop here
      if (newMemberIds.length === 0) {
        return res
          .status(400)
          .json({ message: "All selected members already exist in the group" });
      }

      // Fetch details for only the new members we actually need to add
      const targetMembers = await user.find({ _id: { $in: newMemberIds } });

      if (targetMembers.length === 0) {
        return res.status(444).json({ message: "No valid users found to add" });
      }

      // Format the new members to match your Group schema
      const membersToAdd = targetMembers.map((member) => ({
        userId: member._id,
        userType: "member",
        userName: member.username,
      }));

      // Update the group by pushing all new members using $each
      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        {
          $push: {
            users: { $each: membersToAdd },
          },
        },
        {
          new: true,
          runValidators: true,
          returnDocument: "after",
        },
      );

      // Create notifications for all newly added members in parallel
      const notificationPromises = targetMembers.map((member) =>
        Notification.create({
          userId: member._id,
          senderId: userId,
          message: `${findUser.username} added you to group "${findGroup.name}"`,
          type: "group",
          relatedId: groupId,
        }),
      );
      await Promise.all(notificationPromises);

      return res.status(200).json({
        message: `${targetMembers.length} user(s) added successfully`,
        group: updatedGroup,
      });
    } catch (error) {
      console.error("ADD MEMBER ERROR:", error);
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
        stack: error.stack,
      });
    }
  },

  joinPublicGroup: async (req, res) => {
    const { groupId } = req.body;
    const userId = req.user.id;

    try {
      const findUser = await user.findById(userId);
      if (!findUser) {
        return res.status(404).json({ message: "user not found" });
      }

      const findGroup = await Group.findById(groupId);
      if (!findGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if group is public
      if (findGroup.type !== "public") {
        return res.status(403).json({
          message: "Only public groups can be joined directly",
        });
      }

      // Check if user already exists in group
      const userAlreadyExists = findGroup.users.some(
        (u) => u.userId.toString() === userId,
      );

      if (userAlreadyExists) {
        return res
          .status(400)
          .json({ message: "You are already in this group" });
      }

      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        {
          $push: {
            users: {
              userId: userId,
              userType: "member",
              userName: findUser.username,
            },
          },
        },
        {
          new: true,
          runValidators: true,
          returnDocument: "after",
        },
      );

      // Create notifications for all group members
      const groupMembers = updatedGroup.users.filter(
        (u) => u.userId.toString() !== userId,
      );
      for (const member of groupMembers) {
        await Notification.create({
          userId: member.userId,
          senderId: userId,
          message: `${findUser.username} joined the group "${findGroup.name}"`,
          type: "group",
          relatedId: groupId,
        });
      }

      return res.status(200).json({
        message: "Successfully joined group",
        group: updatedGroup,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  updateGroup: async (req, res) => {
    const { groupId } = req.body;
    const { name, description, groupType } = req.body;
    const groupPics = req.file;
    const userId = req.user.Id;

    try {
      const findGroup = await Group.findById(groupId);
      if (!findGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if current user is admin
      const isAdmin = findGroup.users.some(
        (u) => u.userId.toString() === userId && u.userType === "admin",
      );

      if (!isAdmin) {
        return res
          .status(403)
          .json({ message: "Only admins can update group" });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (description) updateData.description = description;
      if (groupType) updateData.groupType = groupType;
      if (groupPics) updateData.groupPics = groupPics;

      const updatedGroup = await Group.findByIdAndUpdate(groupId, updateData, {
        new: true,
        runValidators: true,
      });

      // Create notifications for all group members
      const otherMembers = updatedGroup.users.filter(
        (u) => u.userId.toString() !== userId,
      );
      for (const member of otherMembers) {
        await Notification.create({
          userId: member.userId,
          senderId: userId,
          message: `${findUser.username} updated group details for "${updatedGroup.name}"`,
          type: "group",
          relatedId: groupId,
        });
      }

      return res.status(200).json({
        message: "Group updated successfully",
        group: updatedGroup,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  removeMember: async (req, res) => {
    const { memberId, groupId } = req.body;
    const userId = req.user.id;

    try {
      const findGroup = await Group.findById(groupId);
      if (!findGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if current user is admin
      const isAdmin = findGroup.users.some(
        (u) => u.userId.toString() === userId && u.userType === "admin",
      );

      if (!isAdmin) {
        return res
          .status(403)
          .json({ message: "Only admins can remove members" });
      }

      // Check if member exists in group
      const memberExists = findGroup.users.some(
        (u) => u.userId.toString() === memberId,
      );

      if (!memberExists) {
        return res.status(404).json({ message: "Member not found in group" });
      }

      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        {
          $pull: {
            users: {
              userId: memberId,
            },
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      // Create notification for removed member
      await Notification.create({
        userId: memberId,
        senderId: userId,
        message: `You were removed from group "${findGroup.name}" by ${findUser.username}`,
        type: "group",
        relatedId: groupId,
      });

      // Create notification for other members
      const otherMembers = updatedGroup.users.filter(
        (u) => u.userId.toString() !== userId,
      );
      for (const member of otherMembers) {
        await Notification.create({
          userId: member.userId,
          senderId: userId,
          message: `A member was removed from group "${findGroup.name}"`,
          type: "group",
          relatedId: groupId,
        });
      }

      return res.status(200).json({
        message: "Member removed successfully",
        group: updatedGroup,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  deleteGroup: async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;
    console.log("Group ID to delete:", groupId);
    console.log(Group);

    try {
      const findGroup = await Group.findById(groupId);
      if (!findGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if current user is admin
      const isAdmin = findGroup.users.some(
        (u) => u.userId.toString() === userId && u.userType === "admin",
      );

      if (!isAdmin) {
        return res
          .status(403)
          .json({ message: "Only admins can delete group" });
      }

      // Create notifications for all group members before deletion
      for (const member of findGroup.users) {
        if (member.userId.toString() !== userId) {
          await Notification.create({
            userId: member.userId,
            senderId: userId,
            message: `Group "${findGroup.name}" has been deleted by ${findUser.username}`,
            type: "group",
            relatedId: groupId,
          });
        }
      }

      await Group.findByIdAndDelete(groupId);

      return res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  leaveGroup: async (req, res) => {
    const { groupId } = req.body;
    const userId = req.user.id;

    try {
      // 1. Fetch the group and the leaving user's data
      const [findGroup, findUser] = await Promise.all([
        Group.findById(groupId),
        user.findById(userId), // Added this to fix the reference error!
      ]);

      if (!findGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (!findUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user exists in group
      const userExists = findGroup.users.some(
        (u) => u.userId.toString() === userId,
      );

      if (!userExists) {
        return res.status(404).json({ message: "You are not in this group" });
      }

      // Check if user is the only admin
      const adminCount = findGroup.users.filter(
        (u) => u.userType === "admin",
      ).length;
      const isAdmin = findGroup.users.some(
        (u) => u.userId.toString() === userId && u.userType === "admin",
      );

      if (isAdmin && adminCount === 1) {
        return res.status(400).json({
          message:
            "Cannot leave group as the only admin. Assign another admin first.",
        });
      }

      // Remove the user from the group
      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        {
          $pull: {
            users: {
              userId: userId,
            },
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      // Create notifications for remaining members
      const remainingMembers = updatedGroup.users.filter(
        (u) => u.userId.toString() !== userId,
      );

      for (const member of remainingMembers) {
        await Notification.create({
          userId: member.userId,
          senderId: userId,
          message: `${findUser.username} left group "${findGroup.name}"`, // Now findUser works perfectly!
          type: "group",
          relatedId: groupId,
        });
      }

      return res
        .status(200)
        .json({ message: "Successfully left group", group: updatedGroup });
    } catch (error) {
      console.log("error message:", error);
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  getAllGroups: async (req, res) => {
    const userId = req.user.id;

    try {
      const groups = await Group.find({ "users.userId": userId })
        .populate("users.userId", "username profilePicture")
        .sort({ createdAt: -1 });

      if (!groups || groups.length === 0) {
        return res.json([]);
      }

      return res.status(200).json({
        message: "Groups retrieved successfully",
        groups,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  getGroupById: async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;

    try {
      const group = await Group.findById(groupId).populate(
        "users.userId",
        "username profilePicture",
      );

      if (!group) {
        return res.status(404).json({
          message: "Group not found",
        });
      }

      // Find logged-in member
      const currentMember = group.users.find((u) => {
        const memberId = u.userId?._id
          ? u.userId._id.toString()
          : u.userId.toString();

        return memberId === userId.toString();
      });

      if (!currentMember) {
        return res.status(403).json({
          message: "You are not a member of this group",
        });
      }

      return res.status(200).json({
        message: "Group retrieved successfully",
        group,
        loggedInUserId: userId,
        userType: currentMember.userType,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  getPublicGroups: async (req, res) => {
    try {
      const publicGroups = await Group.find({ type: "public" })
        .populate("users.userId", "username profilePicture")
        .sort({ createdAt: -1 });

      if (!publicGroups || publicGroups.length === 0) {
        return res.json([]);
      }

      return res.status(200).json({
        message: "Public groups retrieved successfully",
        groups: publicGroups,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  getGroupMessage: async (req, res) => {
    const userId = req.user.id;
    const { groupId } = req.params;

    try {
      // Check if group exists
      const findGroup = await Group.findById(groupId);

      if (!findGroup) {
        return res.status(404).json({
          message: "Group not found",
        });
      }

      // Verify user is a member
      const verifyUser = findGroup.users.some(
        (u) => u.userId.toString() === userId,
      );

      if (!verifyUser) {
        return res.status(403).json({
          message: "You are not a member of this group",
        });
      }

      // Get all messages for this group
      const messages = await GroupMessages.find({
        groupId,
        deletedFor: { $ne: userId },
      }).sort({ createdAt: 1 });

      return res.status(200).json({
        success: true,
        group: {
          _id: findGroup._id,
          name: findGroup.name,
          groupPics: findGroup.groupPics,
        },
        messages,
      });
    } catch (error) {
      console.error("GET GROUP MESSAGE ERROR:", error);

      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },


readGroupMessage: async (req, res) => {
  const { groupId } = req.body;
  const userId = req.user.id;
  console.log(groupId)

  try {
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required.",
      });
    }

    // Mark every unread message in this group as read by this user
    const result = await GroupMessages.updateMany(
      {
        groupId,
        sender: { $ne: userId }, // Don't mark your own messages
        "isReadBy.userId": { $ne: userId }, // User hasn't read it yet
      },
      {
        $push: {
          isReadBy: {
            userId,
            readAt: new Date(),
          },
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} group message(s) marked as read.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("READ GROUP MESSAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark group messages as read.",
    });
  }
},
};

export default GroupController;
