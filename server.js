import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'node:http'
import axios from 'axios'
import { OWNER, REPO, BASE_URL } from './constants.js'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const getCheckSuitesForCommit = async sha => {
  const checkSuiteUrl = `${BASE_URL}/repos/${OWNER}/${REPO}/commits/${sha}/check-suites`
  const response = await axios.get(checkSuiteUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  const status = response?.status

  if (status === 200) {
    const checkResults = []
    const checkSuites = response?.data?.check_suites
    for (const { id, conclusion, status } of checkSuites) {
      checkResults.push({ id, conclusion, status })
    }
    return checkResults
  } else {
    throw new Error(`Failed to fetch check suite data for ${sha}`)
  }
}

/**@description this may be needed when working with travelpass pull requests */
// const getStatusOfCommit = async sha => {
//   const statusURL = `${BASE_URL}/repos/${OWNER}/${REPO}/commits/${sha}/status`
//   const response = await axios.get(statusURL, {
//     headers: {
//       Accept: 'application/vnd.github+json',
//       'X-GitHub-Api-Version': '2022-11-28',
//     },
//   })
//   const status = response?.status
//   if (status === 200) {
//     const state = response?.data?.state
//     return state
//   } else {
//     throw new Error(`Failed to fetch status for ${sha}`)
//   }
// }

/**@todo this should fetch all of the logged-in user's PRs */
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
      const prData = response?.data?.map(pr => ({
        head: pr.head,
        number: pr.number,
        title: pr.title,
      }))
      if (prData?.length) {
        for await (const {
          head: { sha },
          number,
          title,
        } of prData) {
          // const commitStatus = await getStatusOfCommit(sha)
          const checkSuites = await getCheckSuitesForCommit(sha)

          commitShas.push({
            checkSuites,
            number,
            title,
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
