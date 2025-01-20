let owner = process.argv[2]
let repo = process.argv[3]
let user = process.argv[4]
const baseUrl = 'https://api.github.com'
const devFrontendReviewsChannelId = 'C039QHRA6TA'
const deploymentBotTestChannelId = 'C089KFXCWJC'
const channelId = process.argv[2]
  ? devFrontendReviewsChannelId
  : deploymentBotTestChannelId
const ghPat = process.env.PAT

owner ||= 'travelpassgroup'
repo ||= 'travelpass.com'
user ||= 'nookoid'

export { baseUrl, channelId, ghPat, owner, repo, user }
