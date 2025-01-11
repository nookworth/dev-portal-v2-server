import axios from 'axios'
import { owner, ghPat, repo, baseUrl, user } from './constants.js'

export const formatSlackMessage = ({ title, url }) => {
  return `*${user}* requests a review:\n${url}: ${title}`
}

/**@todo this will require the 'checks' permission for my PAT, but I could not find it in the permissions list to request it */
// const getCheckSuitesForCommit = async sha => {
//   const checkSuiteUrl = `${baseUrl}/repos/${owner}/${repo}/commits/${sha}/check-suites`
//   const response = await axios.get(checkSuiteUrl, {
//     headers: {
//       Accept: 'application/vnd.github+json',
//       Authorization: `Bearer ${ghPat}`,
//       'X-GitHub-Api-Version': '2022-11-28',
//     },
//   })
//   const status = response?.status

//   if (status === 200) {
//     const checkResults = []
//     const checkSuites = response?.data?.check_suites
//     for (const { id, conclusion, status, app } of checkSuites) {
//       checkResults.push({ id, conclusion, status, app: app.name })
//     }
//     return checkResults
//   } else {
//     throw new Error(`Failed to fetch check suite data for ${sha}`)
//   }
// }

/**@description this may be needed when working with travelpass pull requests */
const getStatusOfCommit = async sha => {
  const statusURL = `${baseUrl}/repos/${owner}/${repo}/commits/${sha}/status`
  const response = await axios.get(statusURL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${ghPat}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  const status = response?.status
  if (status === 200) {
    const state = response?.data?.state
    return state
  } else {
    throw new Error(`Failed to fetch status for ${sha}`)
  }
}

const getIndividualPR = async number => {
  const url = `${baseUrl}/repos/${owner}/${repo}/pulls/${number}`
  const response = await axios.get(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${ghPat}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  const status = response?.status
  if (status === 200) {
    const { mergeable } = response?.data
    return mergeable
  } else {
    throw new Error(`Failed to fetch info for PR #${number}`)
  }
}

/**@todo this should fetch all of the logged-in user's PRs */
const getPRs = async () => {
  const allPRsURL = `${baseUrl}/repos/${owner}/${repo}/pulls`

  try {
    const response = await axios.get(allPRsURL, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${ghPat}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    const status = response?.status

    if (status === 200) {
      const filteredPRs = []
      const prData = response?.data?.map(pr => ({
        head: pr.head,
        mergeable: pr.mergeable,
        number: pr.number,
        title: pr.title,
        url: pr.html_url,
        username: pr.user.login,
      }))
      if (prData?.length) {
        for await (const {
          head: { sha },
          mergeable,
          number,
          title,
          url,
          username,
        } of prData) {
          if (username !== user) continue

          const status = await getStatusOfCommit(sha)

          filteredPRs.push({
            number,
            mergeable,
            status,
            title,
            url,
            username,
          })
        }
      }
      return filteredPRs
    } else {
      throw new Error('Failed to fetch PRs')
    }
  } catch (e) {
    console.error(e)
  }
}

export { getPRs, getIndividualPR }
