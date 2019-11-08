import bluebird from "bluebird";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { Server } from "http";
import morgan from "morgan";
import redis from "redis";
import socketio, { Socket } from "socket.io";
import uuid from "uuid/v4";

// Redis Config
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const redisClient = redis.createClient();
redisClient.on("error", err => {
  console.log("Error " + err);
});

// Express Config
const app = express();
const port = 8081; // default express port to listen
app.set("port", process.env.PORT || 8081);
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
  )
);
app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:8080", credentials: true }));

// SocketIo Config
const http = new Server(app);
const io = socketio(http);

// Handle creating a new session
app.get("/", (req, res) => {
  res.send(uuid());
});

// Handle joining a session
app.post("/session/:session", async (req, res) => {
  const sessionId = req.params.session;
  try {
    // @ts-ignore
    const session = await redisClient.getAsync(sessionId);
    if (session !== null) {
      console.log(`found current session: ${sessionId}`);
      res.send(sessionId);
    } else {
      console.log(`creating new session: ${sessionId}`);
      // @ts-ignore
      await redisClient.setAsync(sessionId, "");
      const namespace = io.of(sessionId);
      namespace.on("connection", (socket: Socket) => {
        console.log("user connected to session: ", sessionId);
      });
      // Send something to all
      namespace.emit(sessionId, sessionId);
      res.send(sessionId);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

http.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`);
});
