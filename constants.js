let test = process.argv[2]
let owner = process.argv[3]
let repo = process.argv[4]
let user = process.argv[5]
const baseUrl = 'https://api.github.com'
const devFrontendReviewsChannelId = 'C039QHRA6TA'
const deploymentBotTestChannelId = 'C089KFXCWJC'
const channelId =
  test === 'true' ? deploymentBotTestChannelId : devFrontendReviewsChannelId
console.log({ channelId })
const ghPat = process.env.PAT
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${ghPat}`,
  'X-GitHub-Api-Version': '2022-11-28',
}

owner ||= 'travelpassgroup'
repo ||= 'travelpass.com'
user ||= 'nookoid'

export { baseUrl, channelId, ghPat, headers, owner, repo, user }
