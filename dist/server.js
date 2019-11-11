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
redisClient.on('error', err => {
    console.log('Error ' + err);
});
// Express Config
const app = express_1.default();
const port = 8081; // default express port to listen
app.set('port', process.env.PORT || 8081);
app.use(morgan_1.default(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));
app.use(body_parser_1.default.json());
app.use(cors_1.default({ origin: 'http://localhost:8080', credentials: true }));
// SocketIo Config
const http = new http_1.Server(app);
const io = socket_io_1.default(http);
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('user connected to socket');
    // Join specific session
    socket.on('session', (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
        socket.join(sessionId);
    }));
    socket.on('addPlayer', ({ sessionId, id, name, team }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`addPlayer: { sessionId: ${sessionId}, name: ${name}, team: ${team} }`);
        // @ts-ignore
        const currentSession = JSON.parse(yield redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            // Update existing player
            if (playerIndex >= 0) {
                currentSession.players[playerIndex].name = name;
                currentSession.players[playerIndex].team = team;
            }
            else {
                // Add new player
                currentSession.players.push({ bannedIds: [], selectedId: null, id, name, team });
            }
            // @ts-ignore
            yield redisClient.setAsync(sessionId, JSON.stringify(currentSession));
            socket.broadcast.emit('addPlayer', { sessionId, id, name, team });
        }
    }));
    socket.on('updatePlayerName', ({ sessionId, id, name }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`updatePlayerName: { sessionId: ${sessionId}, id: ${id}, name: ${name} }`);
        // @ts-ignore
        const currentSession = JSON.parse(yield redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            if (playerIndex >= 0) {
                currentSession.players[playerIndex].name = name;
                // @ts-ignore
                yield redisClient.setAsync(sessionId, JSON.stringify(currentSession));
                socket.broadcast.emit('updatePlayerName', { sessionId, id, name });
            }
        }
    }));
    socket.on('updatePlayerTeam', ({ sessionId, id, team }) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`updatePlayerTeam: { sessionId: ${sessionId}, id: ${id}, team: ${team} }`);
        // @ts-ignore
        const currentSession = JSON.parse(yield redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            if (playerIndex >= 0) {
                currentSession.players[playerIndex].team = team;
                // @ts-ignore
                yield redisClient.setAsync(sessionId, JSON.stringify(currentSession));
                socket.broadcast.emit('updatePlayerTeam', { sessionId, id, team });
            }
        }
    }));
}));
// Handle creating a new session
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = v4_1.default();
    // @ts-ignore
    yield redisClient.setAsync(sessionId, JSON.stringify({ players: [] }));
    res.send(sessionId);
}));
// Handle joining current session
app.get('/:session', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = req.params.session;
    // @ts-ignore
    const session = yield redisClient.getAsync(sessionId);
    if (session !== null)
        res.send(session);
    else
        res.status(400).send('Invalid session ID');
}));
http.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map