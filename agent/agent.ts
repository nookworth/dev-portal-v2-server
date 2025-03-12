import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages'
import { Annotation, END, StateGraph } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { DynamicStructuredTool } from '@langchain/core/tools'
import { linearTicketRetrievalTool } from './tools.ts'

enum AgentName {
  WRITER = 'writer',
  EDITOR = 'editor',
}

/**@todo add reducer logic */
const agentState = Annotation.Root({
  messages: Annotation<AIMessage[] | HumanMessage[]>,
  reflection: Annotation<AIMessage[]>,
  report: Annotation<AIMessage[]>,
})

type AgentState = typeof agentState.State

/**@description CREATE AGENTS */
const createAgent = async (
  llm: BaseChatModel,
  tools: DynamicStructuredTool[],
  systemMessage: string
) => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a helpful AI assistant, collaborating with other assistants. Use your provided tool to progress towards answering the question. ONLY make one tool call per execution, and ONLY use your provided tool. If you are unable to fully answer, that's OK, another assistant with a different tool will help where you left off. Execute what you can to make progress. You have access to the following tools: {toolNames}.\n{systemMessage}`,
    ],
    new MessagesPlaceholder('messages'),
  ])

  const partialPrompt = await prompt.partial({
    systemMessage,
    toolNames: tools.map(tool => tool.name).join(', '),
  })

  return partialPrompt.pipe(llm.bindTools(tools))
}

/**@description DEFINE AGENT NODES */
const agentNode = async (
  state: AgentState,
  agent: any,
  name: AgentName
): Promise<AgentState> => {
  const messages = state.messages || []
  const reflection = state.reflection || []
  const report = state.report || []

  const result = await agent.invoke({ messages })
  const aiMessage = new AIMessage(result.content, { name })

  messages.push(aiMessage)

  if (name === AgentName.WRITER) {
    report.push(aiMessage)
  } else if (name === AgentName.EDITOR) {
    reflection.push(aiMessage)
  }

  return {
    messages,
    reflection,
    report,
  }
}

const llm = new ChatOpenAI({ model: 'gpt-4o-mini' })

const writerAgent = createAgent(
  llm,
  [linearTicketRetrievalTool],
  'You are an assistant tasked with evaluating the degree to which changes in a codebase meet the requirements of the corresponding Linear ticket.'
)

const writerNode = (state: AgentState): Promise<AgentState> =>
  agentNode(state, writerAgent, AgentName.WRITER)

const editorAgent = createAgent(
  llm,
  [],
  'You are a report editor tasked with giving feedback on written reports. Focus on ensuring the report is succinct and neutral in tone.'
)

const editorNode = (state: AgentState): Promise<AgentState> =>
  agentNode(state, editorAgent, AgentName.EDITOR)

/**@description DEFINE TOOL NODE */
const tools = [linearTicketRetrievalTool]
const toolNode = new ToolNode(tools)

/**@description DEFINE EDGE LOGIC */
const router = (state: AgentState): 'callTool' | '__end__' | 'continue' => {
  const reflection = state.reflection ?? []
  const messages = state.messages ?? []
  const lastMessage = messages.at(-1)

  if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls) {
    return 'callTool'
  }

  if (!reflection.length) {
    return 'continue'
  }

  try {
    const lastMessage = reflection.at(-1)
    if (
      typeof lastMessage?.content === 'string' &&
      lastMessage.content.includes('FINAL ANSWER')
    ) {
      return '__end__'
    }
  } catch (error) {
    return 'continue'
  }

  return 'continue'
}

/**@description DEFINE THE GRAPH */
const workflow = new StateGraph(agentState)
  .addNode('Writer', writerNode, {
    ends: ['Editor', 'callTool', '__end__'],
  })
  .addNode('Editor', editorNode, { ends: ['Writer', '__end__'] })
  .addNode('callTool', toolNode, { ends: [] })
  .addEdge('__start__', 'Writer')
  .compile()
  .stream(
    {
      messages: [
        new HumanMessage({
          content: 'Generate a report on the given Linear ticket',
        }),
      ],
    },
    {
      recursionLimit: 5,
    }
  )
