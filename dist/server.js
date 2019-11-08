"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bluebird_1 = __importDefault(require("bluebird"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const morgan_1 = __importDefault(require("morgan"));
const redis_1 = __importDefault(require("redis"));
const socket_io_1 = __importDefault(require("socket.io"));
const v4_1 = __importDefault(require("uuid/v4"));
// Redis Config
bluebird_1.default.promisifyAll(redis_1.default.RedisClient.prototype);
bluebird_1.default.promisifyAll(redis_1.default.Multi.prototype);
const redisClient = redis_1.default.createClient();
redisClient.on("error", err => {
    console.log("Error " + err);
});
// Express Config
const app = express_1.default();
const port = 8081; // default express port to listen
app.set("port", process.env.PORT || 8081);
app.use(morgan_1.default(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));
app.use(body_parser_1.default.json());
app.use(cors_1.default({ origin: "http://localhost:8080", credentials: true }));
// SocketIo Config
const http = new http_1.Server(app);
const io = socket_io_1.default(http);
// Handle creating a new session
app.get("/", (req, res) => {
    res.send(v4_1.default());
});
// Handle joining a session
app.post("/session/:session", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = req.params.session;
    try {
        // @ts-ignore
        const session = yield redisClient.getAsync(sessionId);
        if (session !== null) {
            console.log(`found current session: ${sessionId}`);
            res.send(sessionId);
        }
        else {
            console.log(`creating new session: ${sessionId}`);
            // @ts-ignore
            yield redisClient.setAsync(sessionId, "");
            const namespace = io.of(sessionId);
            namespace.on("connection", (socket) => {
                console.log("user connected to session: ", sessionId);
            });
            // Send something to all
            namespace.emit(sessionId, sessionId);
            res.send(sessionId);
        }
    }
    catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
}));
http.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map