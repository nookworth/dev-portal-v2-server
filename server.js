// listen to github webhooks from tpg-dev-portal-server and tpg-dev-portal
//

// generate a slack message at the click of a button (post to #devops-mentorship-hub for testing)
// show status indicator lights: yellow = checks running, dark green = checks passed but awaiting approval, light green = checks passed and approved, red = checks failed

import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'node:http'
import axios from 'axios'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const getPRs = () => {
  const url =
    process.env.URL ||
    'https://api.github.com/repos/nookworth/tpg-dev-portal/pulls'

  try {
    const response = axios.get(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        "X-Github-Api-Version": "2022-11-28",
      },
    })
    return response.data
  } catch (e) {
    console.error(e)
  }
}

app.get('/', (req, res) => {
  try {
    const prs = getPRs()
    res.json(prs)
  } catch (e) {
    console.error(e)
    res.status(500).send('Error fetching PRs')
  }
})

// Webhook route (handled by Express)
app.post('/webhook', express.json(), (req, res) => {
  console.log('GitHub webhook event received:', req.body)
  // Broadcast webhook event to all WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(req.body))
    }
  })
  res.status(200).send('Event received')
})

// WebSocket connection handling
wss.on('connection', ws => {
  console.log('WebSocket client connected')
  ws.on('message', message => {
    console.log('Received:', message)
    ws.send('Hello from server')
  })
})

// Start the server
const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
