let owner = process.argv[2]
let repo = process.argv[3]
let user = process.argv[4]
const baseUrl = 'https://api.github.com'
const devFrontendReviewsChannelId = 'C039QHRA6TA'
const devopsMentorshipHubChannelId = 'C07M05V1A2F'
const channelId = process.argv[2]
  ? devFrontendReviewsChannelId
  : devopsMentorshipHubChannelId
const ghPat = process.env.PAT

owner ||= 'nookworth'
repo ||= 'tpg-dev-portal'
user ||= 'nookworth'

export { baseUrl, channelId, ghPat, owner, repo, user }
