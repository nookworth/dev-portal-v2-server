import { baseRepo as base, owner, auth, repo, user } from './constants.ts'
import { Octokit } from 'octokit'

const octokit = new Octokit({
  auth,
})

export const createPullRequest = async (
  body: string,
  head: string,
  title: string
) => {
  const response = await octokit.rest.pulls.create({
    owner,
    repo,
    base,
    body,
    head,
    title,
  })
  const status = response?.status
  if (status === 201) {
    return response?.data
  } else {
    throw new Error(`Failed to create PR: ${status}`)
  }
}

export const formatSlackMessage = ({
  title,
  url,
}: {
  title: string
  url: string
}) => {
  return `*${user}* requests a review:\n${url}: ${title}`
}

// const getStatusOfCommit = async (ref: string) => {
//   const response = await octokit.rest.repos.getCommit({
//     owner,
//     repo,
//     ref,
//   })
//   const status = response?.status
//   if (status === 200) {
//     const state = response?.data
//     return state
//   } else {
//     throw new Error(`Failed to fetch status for ${ref}`)
//   }
// }

const getIndividualPR = async (prNumber: string) => {
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: parseInt(prNumber),
  })
  if (response.status === 200) {
    return response?.data
  } else {
    throw new Error(`Failed to fetch info for PR #${prNumber}`)
  }
}

const getPRs = async () => {
  try {
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
    })
    const status = response?.status

    if (status === 200) {
      const filteredPRs: Array<{
        number: number
        mergeable: string
        ref: string
        // status: string
        title: string
        url: string
        username: string
      }> = []
      const prData = response?.data?.map((pr: any) => ({
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

          // const status = await getStatusOfCommit(sha)

          filteredPRs.push({
            number,
            mergeable,
            ref,
            // status,
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
