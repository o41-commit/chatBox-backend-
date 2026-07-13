import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const LoginController = {
  login: async (req, res) => {
    const { userName, Password } = req.body; // consider renaming to password

    try {
      const foundUser = await User.findOne({ username: userName });
      if (!foundUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const passwordMatches = await bcrypt.compare(
        Password,
        foundUser.password,
      );
      if (!passwordMatches) {
        return res.status(400).json({ message: "Incorrect password" });
      }

      const token = jwt.sign(
        { id: foundUser._id, userName: foundUser.username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const cookieOptions = {
        expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      };

      return res
        .cookie("token", token, cookieOptions)
        .status(200)
        .json({
          message: "Login successful",
          token,
          appearance: foundUser.appearance,
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  },

  register: async (req, res) => {
    const { Password, Name, email, userName } = req.body; // consider lowercase keys

    try {
      if (!Password || !Name || !email || !userName) {
        return res.status(400).json({ message: "Please fill in all fields" });
      }

      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUserName = await User.findOne({ username: userName });
      if (existingUserName) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(Password, saltRounds);

      const newUser = {
        name: Name,
        email: email.toLowerCase(),
        password: hashedPassword,
        username: userName,
      };

      const createdUser = await User.create(newUser);
      if (!createdUser) {
        return res.status(400).json({ message: "User not created" });
      }

      const token = jwt.sign(
        { id: createdUser._id, userName: createdUser.username },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const cookieOptions = {
        expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      };

      return res
        .cookie("token", token, cookieOptions)
        .status(200)
        .json({
          message: "Registration successful",
          token,
          appearance: createdUser.appearance,
          cookieOptions,
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  },
};

export default LoginController;
