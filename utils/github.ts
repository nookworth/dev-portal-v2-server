import { baseRepo as base, owner, octokit, repo, user } from '../constants.ts'

const createPullRequest = async (body: string, head: string, title: string) => {
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
          filteredPRs.push({
            number,
            mergeable,
            ref,
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

export { createPullRequest, getIndividualPR, getPRs }
