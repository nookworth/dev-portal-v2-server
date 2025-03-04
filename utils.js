import axios from 'axios'
import { owner, headers, repo, baseUrl, user } from './constants.js'

export const createPullRequest = async (body, head, title) => {
  const url = `${baseUrl}/repos/${owner}/${repo}/pulls`
  const response = await axios.post(
    url,
    {
      base: 'master',
      body,
      head,
      title,
    },
    {
      headers,
    }
  )
  const status = response?.status
  if (status === 201) {
    return response?.data
  } else {
    throw new Error(`Failed to create PR: ${status.code}`)
  }
}

export const formatSlackMessage = ({ title, url }) => {
  return `*${user}* requests a review:\n${url}: ${title}`
}

const getStatusOfCommit = async sha => {
  const url = `${baseUrl}/repos/${owner}/${repo}/commits/${sha}/status`
  const response = await axios.get(url, {
    headers,
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
    headers,
  })
  const status = response?.status
  if (status === 200) {
    return response?.data
  } else {
    throw new Error(`Failed to fetch info for PR #${number}`)
  }
}

const getPRs = async () => {
  const allPRsURL = `${baseUrl}/repos/${owner}/${repo}/pulls`

  try {
    const response = await axios.get(allPRsURL, {
      headers,
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
          head: { ref, sha },
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
            ref,
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
