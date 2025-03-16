import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
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
      `You are a helpful AI assistant, collaborating with other assistants. Execute what you can to make progress.\n{systemMessage}`,
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
  'You are an assistant tasked with evaluating the degree to which patches from a pull request meet the requirements of the corresponding Linear ticket. Your report should be brief, suitable for a busy executive to read. Your work will be evaluated by your superior who may suggest ways to improve it. You work in a severe culture and will be fired if you addres the evaluator directly; therefore, simply provide the updatd report.'
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
  'You are a report editor tasked with giving feedback on written reports. Focus on ensuring the report is brief and neutral in tone, suitable for a busy executive to read. If you feel that the report writer is editorializing rather than providing a factual analysis, you should make that clear. When you are satisfied with the report, prefix your response with FINAL ANSWER so the writer knows to stop. Provide reasons for your decision regardless of whether the report is ready or not.'
)

const editorNode = async (state: AgentState) => {
  const { messages } = state
  // const clsMap: {
  //   [key: string]: new (content: string | BaseMessageFields) => BaseMessage
  // } = {
  //   ai: HumanMessage,
  //   human: AIMessage,
  //   tool: ToolMessage,
  // }
  // const translated = [
  //   ...messages.slice(0, 4),
  //   ...messages
  //     .slice(4)
  //     .map(msg => new clsMap[msg._getType()](msg.content.toString())),
  // ]
  const res = await editorAgent.invoke({ messages })
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
              ticketNumber: 'TPW-3642',
            },
            id: 'initial_linear',
          },
          {
            name: 'patches',
            args: {
              prNumber: '7203',
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
  console.log({ messages })
  const lastMessage = messages.at(messages.length - 1)

  if (
    typeof lastMessage?.content === 'string' &&
    lastMessage.content.includes('FINAL ANSWER')
  ) {
    console.log('ENDING GRAPH')
    return '__end__'
  }

  return 'continue'
}

const checkpointConfig = { configurable: { thread_id: 'test-thread' } }
const workflow = new StateGraph(agentState)
  .addNode('startNode', startNode)
  .addNode('Writer', writerNode)
  .addNode('Editor', editorNode)
  .addNode('callTool', toolNode)
  .addEdge(START, 'startNode')
  .addEdge('startNode', 'callTool')
  .addEdge('callTool', 'Writer')
  .addEdge('Writer', 'Editor')
  .addConditionalEdges('Editor', router, { continue: 'Writer', __end__: END })

const app = workflow.compile({ checkpointer: new MemorySaver() })

const stream = await app.stream(
  {
    messages: [
      new HumanMessage({
        content: 'Generate a report on the given Linear ticket',
      }),
    ],
  },
  checkpointConfig
)

// const snapshot = await app.getState(checkpointConfig)
// console.log(
//   snapshot.values.messages
//     .map((msg: BaseMessage) => msg.content)
//     .join('\n\n\n------------------\n\n\n')
// )

// for await (const event of stream) {
//   for (const [key, _value] of Object.entries(event)) {
//     console.log(`Event: ${key}`)
//     // Uncomment to see the result of each step.
//     // console.log(value.map((msg) => msg.content).join("\n"));
//     console.log('\n------\n')
//   }
// }
