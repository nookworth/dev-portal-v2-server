import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'
import { END, MemorySaver, START, StateGraph } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { linearTool, patchTool } from './tools.ts'
import { agentState } from '../constants.ts'
import type { AgentState } from '../constants.ts'

/**@description returns a bound model  */
const createAgent = async (llm: BaseChatModel, systemMessage: string) => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a helpful AI assistant, collaborating with other assistants. If you are unable to fully answer, that's OK, another assistant with a different tool will help where you left off. Execute what you can to make progress.\n{systemMessage}`,
    ],
    new MessagesPlaceholder('messages'),
  ])

  const partialPrompt = await prompt.partial({
    systemMessage,
  })

  return partialPrompt.pipe(llm)
}

const llm = new ChatOpenAI({ model: 'gpt-4o-mini' })

const writerAgent = await createAgent(
  llm,
  'You are an assistant tasked with evaluating the degree to which patches from a pull request meet the requirements of the corresponding Linear ticket.'
)

// https://langchain-ai.github.io/langgraphjs/tutorials/reflection/reflection/#define-graph
const writerNode = async (state: AgentState) => {
  const { messages } = state
  return {
    messages: [await writerAgent.invoke({ messages })],
  }
}

const editorAgent = await createAgent(
  llm,
  'You are a report editor tasked with giving feedback on written reports. Focus on ensuring the report is succinct and factual.'
)

const editorNode = async (state: AgentState) => {
  const { messages } = state
  const clsMap: { [key: string]: new (content: string) => BaseMessage } = {
    ai: HumanMessage,
    human: AIMessage,
  }
  const translated = [
    messages[0],
    ...messages
      .slice(1)
      .map(msg => new clsMap[msg._getType()](msg.content.toString())),
  ]
  const res = await editorAgent.invoke({ messages: translated })
  return {
    messages: [new HumanMessage({ content: res.content })],
  }
}

// https://langchain-ai.github.io/langgraphjs/how-tos/force-calling-a-tool-first/#define-the-nodes
const startNode = () => {
  return {
    messages: [
      new AIMessage({
        content: '',
        tool_calls: [
          {
            name: 'linear',
            args: {
              ticketNumber: '1',
            },
            id: 'initial_linear',
          },
          {
            name: 'patches',
            args: {
              prNumber: '7096',
            },
            id: 'initial_patches',
          },
        ],
      }),
    ],
  }
}

const tools = [linearTool, patchTool]
const toolNode = new ToolNode(tools)

const router = (state: AgentState) => {
  const { messages } = state
  if (messages.length > 5) {
    return END
  }

  const lastMessage = messages.at(messages.length - 1)
  if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls) {
    return 'callTool'
  }

  return 'Editor'
}

const checkpointConfig = { configurable: { thread_id: 'test-thread' } }
const workflow = new StateGraph(agentState)
  .addNode('startNode', startNode)
  .addNode('Writer', writerNode)
  .addNode('Editor', editorNode)
  .addNode('callTool', toolNode)
  .addEdge(START, 'startNode')
  .addConditionalEdges('Writer', router)
  .addConditionalEdges('startNode', router)
  .addEdge('Editor', 'Writer')
  .addEdge('callTool', 'Writer')

const app = workflow.compile({ checkpointer: new MemorySaver() })

await app.stream(
  {
    messages: [
      new HumanMessage({
        content: 'Generate a report on the given Linear ticket',
      }),
    ],
  },
  checkpointConfig
)

const snapshot = await app.getState(checkpointConfig)
console.log(
  snapshot.values.messages
    .map((msg: BaseMessage) => msg.content)
    .join('\n\n\n------------------\n\n\n')
)
