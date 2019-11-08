"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = __importDefault(require("socket.io"));
const cors_1 = __importDefault(require("cors"));
const app = express_1.default();
const port = 8081; // default port to listen
app.set("port", process.env.PORT || 8081);
app.use(cors_1.default({ origin: "http://localhost:8080", credentials: true }));
const http = new http_1.Server(app);
const io = socket_io_1.default(http);
io.on("connect", (socket) => {
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
//# sourceMappingURL=server.js.map