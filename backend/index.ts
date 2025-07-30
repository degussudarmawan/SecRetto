import express, { Request, Response } from "express";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import User, { IUser } from "./models/User";
import { ObjectId } from "mongodb";
import Chat from "./models/Chat";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();

const app = express();
const server = http.createServer(app);

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

const frontendURL = "https://secretto-sand.vercel.app";

app.use(
  cors({
    origin: frontendURL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: frontendURL,
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 3001;
const dbURI = process.env.ATLAS_URI;

if (!dbURI) {
  console.error("Error: ATLAS_URI is not defined in your .env file.");
  process.exit(1);
}
mongoose
  .connect(dbURI)
  .then(() => console.log("Successfully connected to MongoDB Atlas!"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const userSocketMap = new Map<string, string>();

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename
    cb(null, `${Date.now()}-${file.originalname}.encrypted`);
  },
});
const upload = multer({ storage });

const parseTimer = (timerString: string): Date | undefined => {
  if (!timerString) return undefined;
  const now = new Date();
  const unit = timerString.slice(-1);
  const value = parseInt(timerString.slice(0, -1));

  if (isNaN(value)) return undefined;

  switch (unit) {
    case "s":
      now.setSeconds(now.getSeconds() + value);
      return now;
    case "m":
      now.setMinutes(now.getMinutes() + value);
      return now;
    case "h":
      now.setHours(now.getHours() + value);
      return now;
    case "d":
      now.setDate(now.getDate() + value);
      return now;
    default:
      return undefined;
  }
};

// Set up Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("register", (userId: string) => {
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on("send_message", async ({ chatId, senderId, content, nonce }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const newMessage = {
        sender: senderId,
        content: content,
        timestamp: new Date(),
        nonce: nonce,
      };

      chat.messages.push(newMessage);
      await chat.save();

      const savedMessage = chat.messages[chat.messages.length - 1];

      // Broadcast the new message to all participants in the chat
      chat.participants.forEach((participantId) => {
        if (participantId.toString() !== senderId) {
          const recipientSocketId = userSocketMap.get(participantId.toString());
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("receive_message", {
              chatId,
              message: savedMessage,
            });
          }
        }
      });
    } catch (error) {
      console.error("Error handling send_message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (let [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });

  setInterval(async () => {
    try {
      const now = new Date();
      // Find chats that have an expiration date in the past
      const expiredChats = await Chat.find({
        expiresAt: { $ne: null, $lte: now },
      });

      for (const chat of expiredChats) {
        console.log(
          `Chat ${chat._id} has expired. Notifying participants and deleting.`
        );

        // Notify all participants that the chat is being aborted
        chat.participants.forEach((participantId) => {
          const socketId = userSocketMap.get(participantId.toString());
          if (socketId) {
            io.to(socketId).emit("chat_aborted", { chatId: chat._id });
          }
        });

        // Delete the chat from the database
        await Chat.findByIdAndDelete(chat._id);
      }
    } catch (error) {
      console.error("Error in expired chat cleanup job:", error);
    }
  }, 60000);
});

app.get("/", (req: Request, res: Response) => {
  res.send("SecRetto Backend Server is running!");
});

app.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return res
        .status(400)
        .json({ message: "Failed to retrieve ID token from Google." });
    }

    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token." });
    }

    const { email, name, sub: googleId } = payload;
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        email,
        username: name || `user_${googleId}`,
        googleId,
      });
      await user.save();
    }

    // Create a JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined in .env file");
    }

    const token = jwt.sign(
      {
        userId: user._id,
        profileComplete: user.isProfileComplete,
        isUnlocked: false,
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    // Set the JWT in a secure, httpOnly cookie
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Send back the response without the user ID
    res.status(200).json({
      message: "Authentication successful!",
      isNewUser,
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res
      .status(500)
      .json({ message: "Server error during Google authentication." });
  }
});

app.post("/api/profile/setup", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authenticated. No token provided." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not defined");
    }

    // Verify the token and extract the userId
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const userId = decoded.userId;

    const { username, publicKey } = req.body;

    if (!username || !publicKey) {
      return res
        .status(400)
        .json({ message: "Username and public key are required." });
    }

    // Check if the username is already taken by another user
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { username, publicKey, isProfileComplete: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newToken = jwt.sign(
      { userId: user._id, profileComplete: true, isUnlocked: true },
      jwtSecret,
      { expiresIn: "1d" }
    );

    res.cookie("authToken", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({ message: "Profile setup successful!" });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    console.error("Profile Setup Error:", error);
    res.status(500).json({ message: "Server error during profile setup." });
  }
});

app.post("/api/logout", (req: Request, res: Response) => {
  res.cookie("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  console.log("yOOOO");
  res.status(200).json({ message: "Logout successful." });
});

app.get("/api/users/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET not defined");

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    // Find the user in the database but exclude the password field
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/api/friends", async (req: Request, res: Response) => {
  try {
    console.log("YOO!!");
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET not defined");

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const currentUserId = decoded.userId;

    const { friendEmail } = req.body;
    if (!friendEmail) {
      return res.status(400).json({ message: "Friend email is required." });
    }

    // The type annotation now uses the simpler IUser interface
    const friend: IUser | null = await User.findOne({ email: friendEmail });

    if (!friend) {
      return res
        .status(404)
        .json({ message: "User with that email not found." });
    }

    if ((friend._id as ObjectId).toString() === currentUserId) {
      return res
        .status(400)
        .json({ message: "You cannot add yourself as a friend." });
    }

    const currentUser: IUser | null = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found." });
    }

    // All subsequent code is now type-safe.
    if (currentUser.friends.some((id) => id.equals(friend._id as ObjectId))) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user." });
    }

    currentUser.friends.push(friend._id as ObjectId);
    friend.friends.push(currentUser._id as ObjectId);

    await currentUser.save();
    await friend.save();

    res
      .status(200)
      .json({ message: `Successfully added ${friend.username} as a friend!` });
  } catch (error) {
    console.error("Add Friend Error:", error);
    res.status(500).json({ message: "Server error while adding friend." });
  }
});

app.get("/api/friends", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET not defined");

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    // Find the user and populate the 'friends' field to get their full documents
    const user = await User.findById(decoded.userId).populate(
      "friends",
      "username _id"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Get Friends Error:", error);
    res.status(500).json({ message: "Server error while fetching friends." });
  }
});

app.post("/api/chats", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET not defined");

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const currentUserId = decoded.userId;

    const { friendId, password, sessionName, timer } = req.body;
    if (!friendId) {
      return res
        .status(400)
        .json({ message: "Friend ID is required to start a chat." });
    }

    // Create a participants array
    const participants = [currentUserId, friendId];

    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const expiresAt = parseTimer(timer);

    // Create the new chat session
    const newChat = new Chat({
      participants,
      password: hashedPassword,
      messages: [],
      name: sessionName,
      expiresAt: expiresAt,
    });

    await newChat.save();

    const chatWithParticipants = await Chat.findById(newChat._id).populate(
      "participants",
      "username _id"
    );

    console.log(
      "[Backend] Sending new chat data in API response:",
      chatWithParticipants
    );

    const otherParticipantSocketId = userSocketMap.get(friendId);
    if (otherParticipantSocketId) {
      io.to(otherParticipantSocketId).emit("new_chat", chatWithParticipants);
    }

    const sanitizedChats = {
      _id: chatWithParticipants?._id,
      participants: chatWithParticipants?.participants,
      updatedAt: chatWithParticipants?.updatedAt,
      messages: chatWithParticipants?.messages,
      hasPassword: !!chatWithParticipants?.password,
      name: chatWithParticipants?.name,
    };

    res
      .status(201)
      .json({ message: "Chat session created!", chat: sanitizedChats });
  } catch (error) {
    console.error("Create Chat Error:", error);
    res.status(500).json({ message: "Server error while creating chat." });
  }
});

app.get("/api/chats", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ message: "Not authenticated." });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET not defined");

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    const chats = await Chat.find({ participants: decoded.userId })
      .populate("participants", "username")
      .sort({ updatedAt: -1 });

    const sanitizedChats = chats.map((chat) => ({
      _id: chat._id,
      participants: chat.participants,
      updatedAt: chat.updatedAt,
      messages: chat.messages,
      hasPassword: !!chat.password,
      name: chat.name,
    }));

    console.log(chats, "bruh", sanitizedChats);
    res.status(200).json(sanitizedChats);
  } catch (error) {
    console.error("Get Chats Error:", error);
    res.status(500).json({ message: "Server error while fetching chats." });
  }
});

app.get("/api/chats/:chatId", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ message: "Not authenticated." });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET not defined");

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    const { chatId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      participants: decoded.userId,
    }).populate("participants", "username _id");

    if (!chat) {
      return res
        .status(404)
        .json({ message: "Chat not found or you are not a participant." });
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching chat." });
  }
});

// Endpoint to verify a chat's password
app.post(
  "/api/chats/:chatId/verify-password",
  async (req: Request, res: Response) => {
    try {
      const token = req.cookies.authToken;
      if (!token)
        return res.status(401).json({ message: "Not authenticated." });

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new Error("JWT_SECRET not defined");

      const decoded = jwt.verify(token, jwtSecret) as { userId: string };
      const { chatId } = req.params;
      const { password } = req.body;

      const chat = await Chat.findOne({
        _id: chatId,
        participants: decoded.userId,
      });

      if (!chat) return res.status(404).json({ message: "Chat not found." });
      if (!chat.password)
        return res
          .status(400)
          .json({ message: "This chat is not password protected." });

      const isMatch = await bcrypt.compare(password, chat.password);

      if (isMatch) {
        res.status(200).json({ message: "Password verified." });
      } else {
        res.status(401).json({ message: "Incorrect password." });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "Server error during password verification." });
    }
  }
);

app.get("/api/users/:userId/key", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ message: "Not authenticated." });

    const user = await User.findById(req.params.userId).select("publicKey");

    if (!user || !user.publicKey) {
      return res.status(404).json({ message: "User or public key not found." });
    }

    res.status(200).json({ publicKey: user.publicKey });
  } catch (error) {
    console.error("Get Public Key Error:", error);
    res.status(500).json({ message: "Server error." });
  }
});

app.post("/api/auth/unlock", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ message: "Not authenticated." });

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET not defined");

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      profileComplete: boolean;
    };

    // Create a new, updated token that includes the 'isUnlocked' flag
    const unlockedToken = jwt.sign(
      { userId: decoded.userId, profileComplete: true, isUnlocked: true },
      jwtSecret,
      { expiresIn: "1d" }
    );

    res.cookie("authToken", unlockedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.status(200).json({ message: "Keys unlocked successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error during unlock." });
  }
});

app.post(
  "/api/files/upload",
  upload.single("file"),
  (req: Request, res: Response) => {
    try {
      const token = req.cookies.authToken;
      if (!token)
        return res.status(401).json({ message: "Not authenticated." });

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      // Return the unique ID (filename) of the stored file
      res.status(201).json({
        message: "File uploaded successfully.",
        fileId: req.file.filename,
      });
    } catch (error) {
      console.error("File Upload Error:", error);
      res.status(500).json({ message: "Server error during file upload." });
    }
  }
);

app.post(
  "/api/files/upload",
  upload.single("file"),
  (req: Request, res: Response) => {
    try {
      const token = req.cookies.authToken;
      if (!token)
        return res.status(401).json({ message: "Not authenticated." });

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      // Return the unique ID (filename) of the stored file
      res.status(201).json({
        message: "File uploaded successfully.",
        fileId: req.file.filename,
      });
    } catch (error) {
      console.error("File Upload Error:", error);
      res.status(500).json({ message: "Server error during file upload." });
    }
  }
);

app.get("/api/files/:fileId", (req: Request, res: Response) => {
  try {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ message: "Not authenticated." });

    const { fileId } = req.params;

    const filePath = path.resolve("uploads", fileId);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found." });
    }
  } catch (error) {
    console.error("File Download Error:", error);
    res.status(500).json({ message: "Server error during file download." });
  }
});

server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
