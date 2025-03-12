import { graphqlWithAuth, octokit, owner, repo } from '../constants.ts'
import { DynamicStructuredTool, tool } from '@langchain/core/tools'
import { z } from 'zod'
import { mockLinearTicket } from '../mocks.ts'

const linearSchema = z.object({})

const prNumberSchema = z.object({
  prNumber: z.string().describe('The number of the pull request to look up'),
})

/**@todo fetch actual Linear ticket */
const linearTicketRetrievalTool: DynamicStructuredTool = tool(
  () => {
    mockLinearTicket
  },
  {
    name: 'Linear ticket retreival',
    description: 'use this to retrieve the contents of a Linear ticket',
    schema: linearSchema,
  }
)

const listCommitsOnPR: DynamicStructuredTool<typeof prNumberSchema> = tool(
  async ({ prNumber }: { prNumber: string }) => {
    const response = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: parseInt(prNumber),
    })
    const commitMessages = response.data.map(commit => commit.commit.message)
    if (response.status === 200) {
      return commitMessages
    } else {
      throw new Error(`Failed to list commits for PR #${prNumber}`)
    }
  },
  {
    name: 'Retrieve commit messages',
    description: 'Use this to retrieve commit messages for a pull request',
    schema: prNumberSchema,
  }
)

const listFilesOnPR: DynamicStructuredTool<typeof prNumberSchema> = tool(
  async ({ prNumber }: { prNumber: string }) => {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: parseInt(prNumber),
    })
    const patches = response.data.map(file => file.patch)
    if (response.status === 200) {
      return patches
    } else {
      throw new Error(`Failed to retrieve patches for PR #${prNumber}`)
    }
  },
  {
    name: 'Retrieve PR patches',
    description:
      'Use to retrive all of the patches introduced by a pull request',
    schema: prNumberSchema,
  }
)

export { linearTicketRetrievalTool, listCommitsOnPR, listFilesOnPR }
