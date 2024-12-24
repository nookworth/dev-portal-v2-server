import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'node:http'
import axios from 'axios'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

// fetch PRs from GitHub REST API
// in the future, this should fetch all of the logged-in user's PRs
const getPRs = async () => {
  const url =
    process.env.URL ||
    'https://api.github.com/repos/nookworth/tpg-dev-portal/pulls'

  try {
    const response = await axios.get(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    const status = response?.status
    if (status?.toString().startsWith('2')) {
      return response?.data
    } else {
      throw new Error('Failed to fetch PRs')
    }
  } catch (e) {
    console.error(e)
  }
}

// the frontend will fetch PRs from this route
app.get('/', async (_, res) => {
  try {
    const prs = await getPRs()
    res.json(prs)
  } catch (e) {
    console.error(e)
    res.status(500).send('Error fetching PRs')
  }
})

app.post('/webhook', express.json(), (req, res) => {
  console.log('GitHub webhook event received:', req.body)
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(req.body))
    }
  })
  res.status(200).send('Event received')
})

wss.on('connection', ws => {
  console.log('WebSocket client connected')
  ws.on('message', message => {
    console.log('Received:', message)
    ws.send('Hello from server')
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
