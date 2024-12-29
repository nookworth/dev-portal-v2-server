import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'node:http'
import axios from 'axios'
import { OWNER, REPO, BASE_URL } from './constants.js'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const getCommitsOnPR = async prNumber => {
  const commitsURL = `${BASE_URL}/repos/${OWNER}/${REPO}/pulls/${prNumber}/commits`
  const commitsResponse = await axios.get(commitsURL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  const commitsStatus = commitsResponse?.status
  if (commitsStatus === 200) {
    return commitsResponse?.data
  } else {
    throw new Error(`Failed to fetch commits for PR ${prNumber}`)
  }
}

const getStatusOfCommit = async commitSha => {
  const statusURL = `${BASE_URL}/repos/${OWNER}/${REPO}/commits/${commitSha}/status`
  const statusResponse = await axios.get(statusURL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  const statusStatus = statusResponse?.status
  if (statusStatus === 200) {
    const state = statusResponse?.data?.state
    return state
  } else {
    throw new Error(`Failed to fetch status for ${commitSha}`)
  }
}

// fetch PRs from GitHub REST API
// in the future, this should fetch all of the logged-in user's PRs
const getPRs = async () => {
  const allPRsURL =
    process.env.URL || `${BASE_URL}/repos/${OWNER}/${REPO}/pulls`

  try {
    const response = await axios.get(allPRsURL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    const status = response?.status
    if (status === 200) {
      const commitShas = []
      const prNumbers = response?.data?.map(pr => pr.number)
      if (prNumbers?.length) {
        for await (const prNumber of prNumbers) {
          const commits = await getCommitsOnPR(prNumber)
          const mostRecentCommitSha = commits[0]?.commit?.tree?.sha

          const status = await getStatusOfCommit(mostRecentCommitSha)

          commitShas.push({
            prNumber,
            mostRecentCommitSha,
            status,
          })
        }
      }
      return commitShas
    } else {
      throw new Error('Failed to fetch PRs')
    }
  } catch (e) {
    console.error(e)
  }
}

// in order to see statuses, i'll need to query the latest commit
// https://docs.github.com/en/rest/commits/statuses?apiVersion=2022-11-28#get-the-combined-status-for-a-specific-reference
// may need to query for checks instead/as well
// https://docs.github.com/en/rest/checks?apiVersion=2022-11-28

// the frontend will fetch PRs from this route
app.get('/', async (_, res) => {
  try {
    const prs = await getPRs()

    res.setHeader('Access-Control-Allow-Origin', '*')
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
