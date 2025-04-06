import 'dotenv/config'

// Command line arguments
let test = process.argv[2]
let owner = process.argv[3]
let repo = process.argv[4]
let user = process.argv[5]

owner ||= 'travelpassgroup'
repo ||= 'travelpass.com'
user ||= 'nookoid'

export { owner, repo, test, user }
