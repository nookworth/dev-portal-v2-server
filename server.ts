import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'node:http'
import { createPullRequest, getPRs, getIndividualPR } from './utils/github.ts'
import { WebClient } from '@slack/web-api'
import bodyParser from 'body-parser'
import { channelId as channel, octokit } from './constants.ts'
import 'dotenv/config'
import { getLinearReport } from './agent/agent.ts'
import { formatSlackMessage, parseBranchName } from './utils/string.ts'
import { handleStatus } from './utils/webhook.ts'

const { SLACK_TOKEN } = process.env

const app = express()
const client = new WebClient(SLACK_TOKEN)
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(bodyParser.text())
app.use(bodyParser.json())

const clients = new Map<string, express.Response[]>()

app.get('/events/:username', (req, res) => {
  const username = req.params.username.toLowerCase()
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.status(200).send('Connected for SSE')

  if (!clients.has(username)) {
    clients.set(username, [])
  }
  clients.get(username)?.push(res)

  req.on('close', () => {
    const userClients = clients.get(username)
    if (userClients) {
      clients.set(
        username,
        userClients.filter(client => client !== res)
      )
      if (clients.get(username)?.length === 0) {
        clients.delete(username)
      }
    }
  })
})

// the frontend fetches PRs from this route
app.get('/', async (_, res) => {
  try {
    const prs = await getPRs()

    /**@todo don't allow ALL origins */
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(prs)
  } catch (e) {
    console.error(e)
    res.status(500).send('Error fetching PRs')
  }
})

app.post('/linear-report', async (req, res) => {
  const { branchName, prNumber } = req.body
  const linearSearchTerm = parseBranchName(branchName)
  const report = await getLinearReport(prNumber, linearSearchTerm)

  if (report) {
    try {
      await octokit.rest.issues.createComment({
        owner: 'travelpassgroup',
        repo: 'travelpass.com',
        issue_number: parseInt(prNumber),
        body: `## Linear Ticket Report\n\n${report}`,
      })
      console.log(`Successfully added Linear report comment to PR #${prNumber}`)
    } catch (error) {
      console.error(
        `Failed to add Linear report comment to PR #${prNumber}:`,
        error
      )
    }
    res.status(200).send(report)
  } else {
    res.status(404).send('Unable to generate Linear report.')
  }
})

app.get('/:number', async (req, res) => {
  const { number } = req.params
  try {
    const pr = await getIndividualPR(number)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(pr)
  } catch (e) {
    console.error(e)
    res.status(500).send(`Error fetching PR number ${number}`)
  }
})

app.post('/new', async (req, res) => {
  const { body, head, title } = req.body
  console.log({ body, head, title })
  try {
    const pr = await createPullRequest(body, head, title)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).send(pr)
  } catch (e) {
    console.error(e)
    res.status(500).send('Error creating PR')
  }
})

app.post('/review-message', async (req, res) => {
  const { title, url } = req.body
  const text = formatSlackMessage({ title, url })
  try {
    const response = await client.chat.postMessage({
      text,
      channel,
    })
    if (response.ok) {
      const { ts } = response.message ?? {}
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.status(200).send({ ts })
    }
  } catch (error) {
    console.error(error)
  }
})

app.post('/webhook', (req, res) => {
  const event = req.headers['x-github-event']
  const payload = req.body

  if (event === 'status') {
    const data = handleStatus(req.body)

    if (data && data.authorUsername && clients.has(data.authorUsername)) {
      clients.get(data.authorUsername)?.forEach(client => {
        client.write(`data: ${JSON.stringify(data.data)}\n\n`)
      })
    }
  }

  // Broadcast all webhooks to all clients for testing
  clients.forEach((userClients, _username) => {
    userClients.forEach(client => {
      client.write(`data: ${JSON.stringify({ event, payload })}\n\n`)
    })
  })

  res.status(200).send('Event received')
})

app.delete('/review-message', async (req, res) => {
  const { ts } = req.body
  try {
    const response = await client.chat.delete({
      channel,
      ts,
    })
    if (response.ok) {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.status(200).send('Message deleted in slack!')
    }
  } catch (error) {
    console.error(error)
  }
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
