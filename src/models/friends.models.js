import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    friends: [
      {
        friendId: {
          type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          required: true,
        },

        friendUserName: {
          type: String,
          required: true,
        },

        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Friend", friendSchema);