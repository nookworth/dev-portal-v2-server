import { linearClient, octokit, owner, repo } from '../constants.ts'
import { DynamicStructuredTool, tool } from '@langchain/core/tools'
import { z } from 'zod'

const linearSchema = z.object({
  ticketNumber: z.string().describe('The Linear ticket number'),
})

const prNumberSchema = z.object({
  prNumber: z.string().describe('The number of the pull request to look up'),
})

const linearTool: DynamicStructuredTool<typeof linearSchema> = tool(
  async ({ ticketNumber }: { ticketNumber: string }) => {
    /**@todo fetch only the fields we need */
    /**@todo include comments */
    try {
      const ticket = await linearClient.issue(ticketNumber)
      return ticket.description
    } catch (error) {
      console.error(error)
      return 'Failed to retrieve ticket'
    }
  },
  {
    name: 'linear',
    description: 'use this to retrieve the contents of a Linear ticket',
    schema: linearSchema,
  }
)

const commitTool: DynamicStructuredTool<typeof prNumberSchema> = tool(
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
    name: 'commits',
    description: 'Use this to retrieve commit messages for a pull request',
    schema: prNumberSchema,
  }
)

const patchTool: DynamicStructuredTool<typeof prNumberSchema> = tool(
  async ({ prNumber }: { prNumber: string }) => {
    const response = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: parseInt(prNumber),
    })
    if (response.status === 200) {
      const patches = response.data.map(file => file.patch)
      return patches
    } else {
      throw new Error(`Failed to retrieve patches for PR #${prNumber}`)
    }
  },
  {
    name: 'patches',
    description:
      'Use to retrive all of the patches introduced by a pull request',
    schema: prNumberSchema,
  }
)

export { linearTool, commitTool, patchTool }
