import express from 'express'
import http from 'node:http'
import bodyParser from 'body-parser'
import 'dotenv/config'
import { handleStatus } from './webhookUtils.ts'

const app = express()
const server = http.createServer(app)

app.use(bodyParser.text())
app.use(bodyParser.json())

const clients = new Map<string, express.Response[]>()

// app.get('/events/:username', (req, res) => {
//   const username = req.params.username.toLowerCase()
//   res.setHeader('Content-Type', 'text/event-stream')
//   res.setHeader('Cache-Control', 'no-cache')
//   res.setHeader('Connection', 'keep-alive')
//   res.setHeader('X-Accel-Buffering', 'no')
//   res.flushHeaders()

//   if (!clients.has(username)) {
//     clients.set(username, [])
//   }
//   clients.get(username)?.push(res)

//   res.write('data: {"type":"connected"}\n\n')

//   const heartbeat = setInterval(() => {
//     res.write(':\n\n')
//   }, 30000)

//   req.on('close', () => {
//     clearInterval(heartbeat)
//     const userClients = clients.get(username)
//     if (userClients) {
//       clients.set(
//         username,
//         userClients.filter(client => client !== res)
//       )
//       if (clients.get(username)?.length === 0) {
//         clients.delete(username)
//       }
//     }
//   })
// })

app.post('/webhook', (req, res) => {
  const event = req.headers['x-github-event']
  const payload = req.body

  console.log({ event, payload })

  // if (event === 'status') {
  //   const data = handleStatus(req.body)

  //   if (data && data.authorUsername && clients.has(data.authorUsername)) {
  //     clients.get(data.authorUsername)?.forEach(client => {
  //       client.write(`data: ${JSON.stringify(data.data)}\n\n`)
  //     })
  //   }
  // }

  // // Broadcast all webhooks to all clients for testing
  // clients.forEach((userClients, _username) => {
  //   userClients.forEach(client => {
  //     client.write(`data: ${JSON.stringify({ event, payload })}\n\n`)
  //   })
  // })

  res.status(200).send('Event received')
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
