import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { Tool } from '@langchain/core/tools'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'

/**
 * need a tool that takes care of the initial deployment process
 * not sure if these two steps should be separate tools 
 * 1. creates a PR from local head branch (?)
 * 2. posts to Slack
 * 
 * do I need a db of timestamps to be able to delete slack posts in the future? or is it OK to stick with the user data file?
 */

/**
 * tool to delete slack posts
 */

/**
 * tool to close PR 
 */

/**
 * tool to merge PR
 */
