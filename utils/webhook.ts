/**
 * TODO: types
 * potentiallly use https://github.com/octokit/webhooks
 */
export const handlePullRequestReview = payload => {
  const { action, review, pull_request } = payload
  if (action === 'submitted') {
    return {
      data: {
        state: review.state,
        reviewer: review.user.login,
        prNumber: pull_request.number,
        prTitle: pull_request.title,
        comment: review.body,
        url: pull_request.html_url,
      },
    }
  }
  return null
}

export const handleStatus = payload => {
  const { commit, context, description, sha, state, target_url } = payload
  const { author } = commit

  console.log({ author })

  return {
    authorUsername: author.login.toLowerCase(),
    data: {
      state,
      context,
      description,
      url: target_url,
      sha,
    },
  }
}
