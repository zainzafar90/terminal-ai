import ollama from "ollama";
import { intro, outro, spinner, isCancel, cancel, text } from "@clack/prompts";
import color from "picocolors";

const queryAI = async (userInput) => {
  try {
    const response = await ollama.chat({
      model: "mistral",
      messages: [
        {
          role: "system",
          content: `
          You are a Docker Developer.
          I will give you a prompt to create a single line bash command that one can enter in a terminal and run, based on what is asked in the prompt. 
          Important:
           - Only give a single command other politely decline.
           - Do not greet the user.
           - Do not ask for more information.
           - Do not add any additional information.
          `,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      stream: true,
      raw: false,
    });

    let text = "";
    for await (const part of response) {
      text += part.message.content;
    }

    return text;
  } catch (error) {
    console.error(error);
  } finally {
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

  const response = await queryAI(prompt);
  s.stop("Reponse:");

  outro(response);

  queryUser();
}

queryUser();
