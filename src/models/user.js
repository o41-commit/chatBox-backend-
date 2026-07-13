import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true, 
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
      required: false,
    },

    appearance: {
      type: String,
      default: "light",
      required: false,
    },

    lastLogin: {
      type: Date,
      default: Date.now,
      required: false,
    },

    verified: {
      type: Boolean,
      default: false,
      required: false,
    },

    profilePicture: {
      type: String,
      default: "",
      required: false,
    },

    isOnline: {
      type: Boolean,
      default: false,
      required: false,
    },

    lastSeen: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.virtual('isProfileComplete').get(function() {
  return !!(this.username && this.phoneNumber && this.appearance && this.profilePicture);
});

export default mongoose.model("User", userSchema);