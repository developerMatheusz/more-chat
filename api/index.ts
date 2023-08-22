import express from "express";
import dotnenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import fs from "fs";
import ws, { WebSocket } from "ws";
import jwt, { Secret } from "jsonwebtoken";
import cors from "cors";
import { UserModel } from "./models/User";
import { MessageModel } from "./models/Message";

interface CustomWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive?: boolean;
  timer?: any;
  deathTimer?: any;
}

dotnenv.config();
mongoose.connect(`${process.env.MONGO_URL}`);

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret: Secret = process.env.JWT_SECRET || "";
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();

app.use("/uploads", express.static(__dirname + "/uploads"));

app.use(express.json());

app.use(cookieParser());

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL
  })
);

async function getUserDataFromRequest(req: any) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;

    if (token) {
      jwt.verify(token, jwtSecret, (err: any, userData: any) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("Não há token. Desculpe!");
    }
  });
}

app.get("/people", async (req, res) => {
  const users = await UserModel.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData: any = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;

  const messages = await MessageModel.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] }
  }).sort({ createdAt: 1 });

  res.json(messages);
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;

  if (token) {
    jwt.verify(token, jwtSecret, (err: any, userData: any) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("Não há token. Desculpe!");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await UserModel.findOne({ username });

  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password!);

    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err: any, token: any) => {
          res
            .cookie("token", token, { sameSite: "none", secure: isProduction })
            .json({
              id: foundUser._id
            });
        }
      );
    }
  }
});

app.post("/logout", (req, res) => {
  res
    .cookie("token", "", { sameSite: "none", secure: isProduction })
    .json("Ok!");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await UserModel.create({
      username: username,
      password: hashedPassword
    });

    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err: any, token: any) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: isProduction })
          .status(201)
          .json({
            id: createdUser._id
          });
      }
    );
  } catch (error) {
    if (error) throw error;
    res.status(500).json("Erro!");
  }
});

const server = app.listen(4040);

const wsServer = new ws.WebSocketServer({ server });

wsServer.on("connection", (connection: CustomWebSocket, req) => {
  function notifyAboutOnlinePeople() {
    Array.from(wsServer.clients).forEach((client: CustomWebSocket) => {
      client.send(
        JSON.stringify({
          online: Array.from(wsServer.clients).map((c: CustomWebSocket) => ({
            userId: c.userId,
            username: c.username
          }))
        })
      );
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  const cookies = req.headers.cookie;

  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str: string) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];

      if (token) {
        jwt.verify(token, jwtSecret, (err: any, userData: any) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData;
    let fileName: string | null = null;

    if (file) {
      const parts = file.name.split(".");
      const extension = parts[parts.length - 1];
      fileName = Date.now() + "." + extension;
      const path = __dirname + "/uploads/" + fileName;
      const bufferData = Buffer.from(file.data.split(",")[1], "base64");
      fs.writeFile(path, bufferData, () => {
        console.log("Arquivo salvo em: " + path);
      });
    }

    if (recipient && (text || file)) {
      const messageDoc = await MessageModel.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? fileName : null
      });

      Array.from(wsServer.clients)
        .filter((c: CustomWebSocket) => c.userId === recipient)
        .forEach((c: WebSocket) =>
          c.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file: file ? fileName : null,
              _id: messageDoc._id
            })
          )
        );
    }
  });

  notifyAboutOnlinePeople();
});
