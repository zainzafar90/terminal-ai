import OpenAI from "openai";
import color from "picocolors";
import { intro, spinner, isCancel, cancel, text } from "@clack/prompts";

import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * If the response from the AI is valid, but the command is not safe, the assistant should not provide a command and should instead provide a message explaining why it cannot provide a command.
 *
 * @param {Response} response
 * @returns command, usage, reference or error
 */
const processResponseFromAI = (response) => {
  if (response.choices[0].message.content) {
    return response.choices[0].message.content;
  } else if (response.choices[0].message.tool_calls[0].function.arguments) {
    const { command, usage, reference } = JSON.parse(
      response.choices[0].message.tool_calls[0].function.arguments
    );
    return {
      command,
      usage,
      reference,
    };
  } else {
    throw new Error("I'm sorry, I couldn't find a command for that.");
  }
};

const queryAI = async (userInput) => {
  try {
    const messages = [
      {
        role: "system",
        content: `
        You are a Docker Developer. 
        User will enter a prompt to create a single line bash command that one can enter in a terminal and run, based on what is asked in the prompt. 
        The assistant will then respond with the command that the user should run.
        IMPORTANT: If the user asks for a command that is not safe, the assistant should not provide a command and should instead provide a message explaining why it cannot provide a command.
        `,
      },
      {
        role: "user",
        content: "list all containers",
      },
      {
        role: "assistant",
        content:
          '{"command":"docker ps -a","usage":"List all containers, including those that have exited","reference":"https://docs.docker.com/engine/reference/commandline/ps/"}',
      },
      {
        role: "user",
        content: userInput,
      },
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "get_command",
          description: "Get the command to run based on the user's prompt",
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "command to run, e.g. 'docker ps -a'",
              },
              usage: {
                type: "string",
                description: "usage of the command",
              },
              reference: {
                type: "string",
                description: "reference to the documentation",
              },
            },
            required: ["command", "usage", "reference"],
          },
        },
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      max_tokens: 200,
      temperature: 0.0,
    });

    return processResponseFromAI(response);
  } catch (error) {
    throw new Error(error);
  }
};

async function queryUser() {
  console.log();

  intro(color.bgCyan(" Docker Terminal Assistant "));

  const prompt = await text(
    {
      message: "What do you need help with?",
      placeholder: "list all containers",
    },
    { color: "cyan" }
  );

  if (isCancel(prompt)) {
    cancel("As you wish. Goodbye!");
    return process.exit(0);
  }

  const s = spinner();
  s.start("thinking...");

  try {
    const response = await queryAI(prompt);

    if (response.command) {
      s.stop(`Command: ${color.cyan(response.command)}`);
      s.stop(`Usage: ${color.gray(response.usage)}`);
      s.stop(`Reference: ${color.underline(response.reference)}`);
    } else {
      s.stop(`${color.red(response)}`);
    }
  } catch (error) {
    s.stop(`${color.red(error)}`);
  }

  queryUser();
}

queryUser();
