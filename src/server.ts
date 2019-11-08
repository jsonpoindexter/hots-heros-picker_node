import express from "express";
import { Server } from "http";
import socketio from "socket.io";
import cors from "cors";

const app = express();
const port = 8081; // default port to listen
app.set("port", process.env.PORT || 8081);
app.use(cors({ origin: "http://localhost:8080", credentials: true }));
const http = new Server(app);
const io = socketio(http);

io.on("connect", (socket: any) => {
  console.log("a user connected");
});

// define a route handler for the default home page
app.get("/", (req, res) => {
  console.log('app.get("/")');
  res.send("Hello world!");
});

http.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`);
});

