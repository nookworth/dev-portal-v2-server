let owner = process.argv[2]
let repo = process.argv[3]
let user = process.argv[4]
const ghPat = process.env.PAT
const baseUrl = 'https://api.github.com'

owner ||= 'nookworth'
repo ||= 'tpg-dev-portal'
user ||= 'nookworth'

export { baseUrl, ghPat, owner, repo, user }
