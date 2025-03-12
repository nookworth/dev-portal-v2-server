import 'dotenv/config'
import { Octokit } from 'octokit'
import { graphql } from '@octokit/graphql'

let test = process.argv[2]
let owner = process.argv[3]
let repo = process.argv[4]
let user = process.argv[5]
const baseRepo = owner === 'travelpassgroup' ? 'master' : 'main'
const baseUrl = 'https://api.github.com'
const devFrontendReviewsChannelId = 'C039QHRA6TA'
const deploymentBotTestChannelId = 'C089KFXCWJC'
const channelId =
  test === 'true' ? deploymentBotTestChannelId : devFrontendReviewsChannelId
const langchainApiKey = process.env.LANGCHAIN_API_KEY
const openAIKey = process.env.OPENAI_API_KEY
const nookworthPat = process.env.NOOKWORTH_PAT
const tpgPat = process.env.PAT
const auth =
  test === 'false'
    ? tpgPat
    : owner === 'travelpassgroup'
    ? tpgPat
    : nookworthPat
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${auth}`,
  'X-GitHub-Api-Version': '2022-11-28',
}
const octokit = new Octokit({
  auth,
})
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: auth,
  },
})

console.log({ test })

owner ||= 'travelpassgroup'
repo ||= 'travelpass.com'
user ||= 'nookoid'

export {
  baseRepo,
  baseUrl,
  channelId,
  auth,
  headers,
  owner,
  repo,
  user,
  openAIKey,
  langchainApiKey,
  octokit,
  graphqlWithAuth,
}
