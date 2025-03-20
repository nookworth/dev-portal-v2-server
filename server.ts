import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'node:http'
import {
  createPullRequest,
  formatSlackMessage,
  getPRs,
  getIndividualPR,
  parseBranchName,
} from './utils.ts'
import { WebClient } from '@slack/web-api'
import bodyParser from 'body-parser'
import { channelId as channel, octokit } from './constants.ts'
import 'dotenv/config'
import { getLinearReport } from './agent/agent.ts'

const { SLACK_TOKEN } = process.env

const app = express()
const client = new WebClient(SLACK_TOKEN)
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(bodyParser.text())
app.use(bodyParser.json())

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
        body: `## Linear Ticket Report\n\n${report}`
      });
      console.log(`Successfully added Linear report comment to PR #${prNumber}`);
    } catch (error) {
      console.error(`Failed to add Linear report comment to PR #${prNumber}:`, error);
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
  console.log('GitHub webhook event received:', req.body)
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(req.body))
    }
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
