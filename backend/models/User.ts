import mongoose, { Schema, Document, Model } from "mongoose";

// A single, clear interface that defines the user document's shape.
export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  publicKey?: string;
  friends: mongoose.Types.ObjectId[];
  isProfileComplete: boolean;
}

const userSchema: Schema<IUser> = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: false },
    googleId: { type: String, required: false, unique: true, sparse: true },
    publicKey: { type: String, required: false },
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
