import mongoose, { Schema, Document } from "mongoose";

// Interface for a single message
interface IMessage {
  sender: mongoose.Types.ObjectId;
  content: string;
  timestamp: Date;
  nonce: string;
}

// Interface for a Chat document
export interface IChat extends Document {
  participants: mongoose.Types.ObjectId[];
  messages: IMessage[];
  password?: string;
  expiresAt?: Date;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema: Schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  nonce: { type: String, required: true },
});

const chatSchema: Schema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    messages: [messageSchema],
    password: {
      type: String,
      required: false,
    },
    expiresAt: {
      type: Date,
      required: false,
      index: { expires: '0s' },
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IChat>("Chat", chatSchema);
