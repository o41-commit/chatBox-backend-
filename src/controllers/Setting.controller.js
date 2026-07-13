import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const Settings = {
  ChangeInfo: async (req, res) => {
    const { UserName, Email, phoneNumber } = req.body;
    const userId = req.user.id;

    try {
      const findUser = await User.findById(userId);

      if (!findUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // Update Email
      if (Email) {
        const lowerCaseEmail = Email.trim().toLowerCase();

        const usedEmail = await User.findOne({
          email: lowerCaseEmail,
        });

        if (usedEmail && usedEmail._id.toString() !== userId) {
          return res.status(400).json({
            message: "Email is already in use",
          });
        }

        findUser.email = lowerCaseEmail;
      }

      //   console.log(req.body);
      //   console.log(UserName);

      // Update Username
      if (UserName) {
        const lowerCaseUser = UserName.trim().toLowerCase();

        const usedUserName = await User.findOne({
          username: lowerCaseUser,
        });

        if (usedUserName && usedUserName._id.toString() !== userId) {
          return res.status(400).json({
            message: "Username is already taken",
          });
        }

        findUser.username = lowerCaseUser;
      }

      // Update Phone Number
      if (phoneNumber) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;

        if (!phoneRegex.test(phoneNumber)) {
          return res.status(400).json({
            message: "Invalid phone number format",
          });
        }

        const usedPhone = await User.findOne({
          phoneNumber,
        });

        if (usedPhone && usedPhone._id.toString() !== userId) {
          return res.status(400).json({
            message: "Phone number is already in use by another account",
          });
        }

        findUser.phoneNumber = phoneNumber;
      }

      await findUser.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: findUser,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  ChangePassword: async (req, res) => {
    const { newPassword, OldPassword, ConfirmPassword } = req.body;
    const userId = req.user.id;

    try {
      if (!newPassword || !OldPassword || !ConfirmPassword) {
        return res.status(400).json({
          message: "Please fill up all fields",
        });
        console.log("Please fill up all fields");
        console.log(req.body);
      }

      const findUser = await User.findById(userId);

      if (!findUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (newPassword !== ConfirmPassword) {
        return res.status(400).json({
          message: "Passwords do not match",
        });
      }

      const comparePassword = await bcrypt.compare(
        OldPassword,
        findUser.password,
      );

      if (!comparePassword) {
        return res.status(400).json({
          message: "Incorrect password",
        });
      }

      const saltRound = 16;
      const hashedPassword = await bcrypt.hash(newPassword, saltRound);

      findUser.password = hashedPassword;

      await findUser.save();

      return res.status(200).json({
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  ChangeTheme: async (req, res) => {
    const { theme } = req.body;
    const userId = req.user.id;

    try {
      const findUser = await User.findById(userId);

      if (!findUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      findUser.appearance = theme;

      await findUser.save();

      return res.status(200).json({
        message: "Profile updated successfully",
        appearance: findUser.appearance,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },

  UploadProfilePicture: async (req, res) => {
    const userId = req.user.id;
    console.log(req.file, userId);
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No file uploaded",
        });
      }

      const findUser = await User.findById(userId);

      if (!findUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      findUser.profilePicture = req.file.path;

      await findUser.save();

      return res.status(200).json({
        message: "Profile picture updated successfully",
        profilePicture: findUser.profilePicture,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },
};

export default Settings;
