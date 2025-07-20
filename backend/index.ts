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

dotenv.config();

const app = express();
const server = http.createServer(app);

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
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

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
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
      { userId: user._id, profileComplete: user.isProfileComplete },
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

    const { username } = req.body;

    // Check if the username is already taken by another user
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { username, isProfileComplete: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const newToken = jwt.sign(
      { userId: user._id, profileComplete: true },
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

server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
