import user from "../models/user.js";

const Profile = {
  getProfile: async (req, res) => {
    const UserId = req.user.id;
    // console.log(UserId);
    try {
      const findUser = await user.findById(UserId).select("-password");

      if (!findUser) {
        return res.status(404).json({ message: "user not found" });
      }


      // console.log(findUser);
      return res.status(200).json(findUser);
    } catch (error) {
        console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },
  getUserProfile: async (req, res) => {
    const UserId = req.params.id;
    console.log(UserId);
    try {
      const findUser = await user.findById(UserId).select("-password");

      if (!findUser) {
        return res.status(404).json({ message: "user not found" });
      }


      console.log(findUser);
      return res.status(200).json(findUser);
    } catch (error) {
        console.error(error);
      return res.status(500).json({
        message: "Something went wrong",
        error: error.message,
      });
    }
  },
};

export default Profile;
