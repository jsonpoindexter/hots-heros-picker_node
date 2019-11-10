import bluebird from 'bluebird'
import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import { Server } from 'http'
import morgan from 'morgan'
import redis from 'redis'
import socketio, { Socket } from 'socket.io'
import uuid from 'uuid/v4'
import { Player, Session, Team } from './types'

// Redis Config
bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const redisClient = redis.createClient()
redisClient.on('error', err => {
  console.log('Error ' + err)
})

// Express Config
const app = express()
const port = 8081 // default express port to listen
app.set('port', process.env.PORT || 8081)
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
  ),
)
app.use(bodyParser.json())
app.use(cors({ origin: 'http://localhost:8080', credentials: true }))

// SocketIo Config
const http = new Server(app)
const io = socketio(http)
io.on('connection', async (socket: Socket) => {
  console.log('user connected to socket')
  // Join specific session
  socket.on('session', async sessionId => {
    socket.join(sessionId)
  })
  socket.on('addPlayer', async ({ sessionId, name, team }) => {
    console.log(`addPlayer: { sessionId: ${sessionId}, name: ${name}, team: ${team} }`)
    // @ts-ignore
    const currentSession: Session = JSON.parse(await redisClient.getAsync(sessionId))
    const playerIndex = currentSession.players.findIndex((player: Player) => player.name === name)
    if (playerIndex >= 0) {
      currentSession.players[playerIndex].name = name
      currentSession.players[playerIndex].team = team
    } else {
      currentSession.players.push({ bannedIds: [], selectedId: null, name, team })
    }
    // @ts-ignore
    await redisClient.setAsync(sessionId, JSON.stringify(currentSession))
  })
})

// Handle creating a new session
app.get('/', async (req, res) => {
  const sessionId = uuid()
  await redisClient.setAsync(sessionId, JSON.stringify({ players: [] }))
  res.send(sessionId)
})

// Handle joining current session
app.get('/:session', async (req, res) => {
  const sessionId = req.params.session
  const session = await redisClient.getAsync(sessionId)
  if(session !== null)  res.send(session)
  else res.status(400).send('Invalid session ID')
})

http.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`)
})
