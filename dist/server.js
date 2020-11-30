"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bluebird_1 = tslib_1.__importDefault(require("bluebird"));
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const express_1 = tslib_1.__importDefault(require("express"));
const http_1 = require("http");
const morgan_1 = tslib_1.__importDefault(require("morgan"));
const redis_1 = tslib_1.__importDefault(require("redis"));
const socket_io_1 = tslib_1.__importDefault(require("socket.io"));
const v4_1 = tslib_1.__importDefault(require("uuid/v4"));
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
io.on('connection', async (socket) => {
    console.log('user connected to socket');
    // Join specific session
    socket.on('session', async (sessionId) => {
        console.log('join session: ', sessionId);
        socket.join(sessionId);
    });
    socket.on('addPlayer', async ({ sessionId, id, name, team, selectedId, bannedIds }) => {
        console.log(`addPlayer: { sessionId: ${sessionId}, name: ${name}, team: ${team}, selectedId: ${selectedId}, bannedIds, ${bannedIds}`);
        // @ts-ignore
        const currentSession = JSON.parse(await redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            // Update existing player
            if (playerIndex >= 0) {
                currentSession.players[playerIndex].name = name;
                currentSession.players[playerIndex].team = team;
            }
            else {
                // Add new player
                currentSession.players.push({ bannedIds, selectedId, id, name, team });
            }
            // @ts-ignore
            await redisClient.setAsync(sessionId, JSON.stringify(currentSession));
            socket.to(sessionId).emit('addPlayer', { sessionId, id, name, team, selectedId, bannedIds });
        }
    });
    socket.on('updatePlayerName', async ({ sessionId, id, name }) => {
        console.log(`updatePlayerName: { sessionId: ${sessionId}, id: ${id}, name: ${name} }`);
        // @ts-ignore
        const currentSession = JSON.parse(await redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            if (playerIndex >= 0) {
                currentSession.players[playerIndex].name = name;
                // @ts-ignore
                await redisClient.setAsync(sessionId, JSON.stringify(currentSession));
                socket.to(sessionId).emit('updatePlayerName', { sessionId, id, name });
            }
        }
    });
    socket.on('updatePlayerTeam', async ({ sessionId, id, team }) => {
        console.log(`updatePlayerTeam: { sessionId: ${sessionId}, id: ${id}, team: ${team} }`);
        // @ts-ignore
        const currentSession = JSON.parse(await redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            if (playerIndex >= 0) {
                currentSession.players[playerIndex].team = team;
                // @ts-ignore
                await redisClient.setAsync(sessionId, JSON.stringify(currentSession));
                socket.to(sessionId).emit('updatePlayerTeam', { sessionId, id, team });
            }
        }
    });
    socket.on('updateSelectedHero', async ({ sessionId, id, heroId }) => {
        console.log(`updateSelectedHero: { sessionId: ${sessionId}, id: ${id}, heroId: ${heroId} }`);
        // @ts-ignore
        const currentSession = JSON.parse(await redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            if (playerIndex >= 0) {
                const { players } = currentSession;
                const player = currentSession.players[playerIndex];
                // Check if User is trying to select a hero that has been selected by another player
                if (players
                    .filter((player) => player.id !== id)
                    .map((player) => player.selectedId)
                    .includes(heroId))
                    return;
                // Check if User is trying to ban/un-ban a hero that has been banned by another player
                if (players
                    .filter((player) => player.id !== id)
                    .flatMap((player) => player.bannedIds)
                    .includes(heroId))
                    return;
                // Toggle selected
                player.selectedId = player.selectedId === heroId ? null : heroId;
                // @ts-ignore
                await redisClient.setAsync(sessionId, JSON.stringify(currentSession));
                socket.to(sessionId).emit('updateSelectedHero', { sessionId, id, heroId });
            }
        }
    });
    socket.on('updateBannedHero', async ({ sessionId, id, heroId }) => {
        console.log(`updateBannedHero: { sessionId: ${sessionId}, id: ${id}, heroId: ${heroId} }`);
        // @ts-ignore
        const currentSession = JSON.parse(await redisClient.getAsync(sessionId));
        if (currentSession) {
            const playerIndex = currentSession.players.findIndex((player) => player.id === id);
            if (playerIndex >= 0) {
                const { players } = currentSession;
                const player = currentSession.players[playerIndex];
                // Check if User is trying to ban a hero that has been selected by another player
                if (players
                    .filter((player) => player.id !== id)
                    .map((player) => player.selectedId)
                    .includes(heroId))
                    return;
                // Check if User is trying to ban/un-ban a hero that has been banned by another player
                if (players
                    .filter((player) => player.id !== id)
                    .flatMap((player) => player.bannedIds)
                    .includes(heroId))
                    return;
                const index = player.bannedIds.findIndex((id) => id === heroId);
                index >= 0 ? player.bannedIds.splice(index, 1) : player.bannedIds.push(heroId);
                // @ts-ignore
                await redisClient.setAsync(sessionId, JSON.stringify(currentSession));
                socket.to(sessionId).emit('updateBannedHero', { sessionId, id, heroId });
            }
        }
    });
});
// Handle creating a new session
app.get('/', async (req, res) => {
    const sessionId = v4_1.default();
    // @ts-ignore
    await redisClient.setAsync(sessionId, JSON.stringify({ players: [] }));
    res.send(sessionId);
});
// Handle joining current session
app.get('/:session', async (req, res) => {
    const sessionId = req.params.session;
    // @ts-ignore
    const session = await redisClient.getAsync(sessionId);
    if (session !== null)
        res.send(session);
    else
        res.status(400).send('Invalid session ID');
});
http.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map