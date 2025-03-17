import 'dotenv/config'
import { Octokit } from 'octokit'
import { graphql } from '@octokit/graphql'
import { Annotation } from '@langchain/langgraph'
import { BaseMessage, ToolMessage } from '@langchain/core/messages'
import { LinearClient } from '@linear/sdk'

// Command line arguments
let test = process.argv[2]
let owner = process.argv[3]
let repo = process.argv[4]
let user = process.argv[5]

// Constants
const baseRepo = owner === 'travelpassgroup' ? 'master' : 'main'
const baseUrl = 'https://api.github.com'
const devFrontendReviewsChannelId = 'C039QHRA6TA'
const deploymentBotTestChannelId = 'C089KFXCWJC'
const channelId =
  test === 'true' ? deploymentBotTestChannelId : devFrontendReviewsChannelId

// Environment variables
const langchainApiKey = process.env.LANGCHAIN_API_KEY
const openAIKey = process.env.OPENAI_API_KEY
const nookworthPat = process.env.NOOKWORTH_PAT
const tpgPat = process.env.PAT
const linearApiKey = process.env.LINEAR_API_KEY
const auth =
  test === 'false'
    ? tpgPat
    : owner === 'travelpassgroup'
    ? tpgPat
    : nookworthPat

// API clients
const linearClient = new LinearClient({
  apiKey: linearApiKey,
})
const octokit = new Octokit({
  auth,
})
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: auth,
  },
})

const agentState = Annotation.Root({
  linearTicket: Annotation<ToolMessage[]>,
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  patches: Annotation<ToolMessage[]>,
})

type AgentState = typeof agentState.State

owner ||= 'travelpassgroup'
repo ||= 'travelpass.com'
user ||= 'nookoid'

console.log({ test, owner, repo, user })

export {
  agentState,
  auth,
  baseRepo,
  baseUrl,
  channelId,
  graphqlWithAuth,
  langchainApiKey,
  linearClient,
  octokit,
  openAIKey,
  owner,
  repo,
  user,
}

export type { AgentState }
