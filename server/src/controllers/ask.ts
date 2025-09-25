import OpenAI from "openai";
import crypto from "crypto";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const UID = "api::gpt-message.gpt-message";
const hash = s => crypto.createHash("sha256").update(s).digest("hex");

async function createSummary(model, messages) {
  const summaryPrompt = [
    {
      role: "system",
      content:
        "Summarize the following conversation briefly (max 250 words). Keep names, important details and context.",
    },
    ...messages.map(m => ({
      role: m.who === "gpt" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const res = await client.chat.completions.create({
    model,
    messages: summaryPrompt,
  });

  return res.choices?.[0]?.message?.content ?? "";
}

async function askOpenAI(model, summary, history, text) {
  const messages = [];

  if (summary) {
    messages.push({
      role: "system",
      content: `Summary of previous conversation: ${summary}`,
    });
  }

  messages.push(
    ...history.slice(-10).map(m => ({
      role: m.who === "gpt" ? "assistant" : "user",
      content: m.content,
    }))
  );

  messages.push({ role: "user", content: text });

  const c = await client.chat.completions.create({
    model,
    messages,
    prompt_cache_key: hash(messages.map(m => m.content).join("||")),
  });

  return c.choices?.[0]?.message?.content ?? "No response";
}

export default {
  async index(ctx) {
    try {
      const { message, model = "gpt-5-mini", chatId, personalName } = ctx.request.body;
      if (!message?.trim()) ctx.throw(400, "Message is required");

      if (!chatId) {
        const reply = await askOpenAI(model, "", [], message);
        const created = await strapi.documents(UID).create({
          data: {
            dateTime: new Date().toISOString(),
            model,
            personalName,
            summary: "",
            askAnswer: [
              { who: "user", content: message },
              { who: "gpt", content: reply },
            ],
          },
          fields: ["documentId"],
        });

        ctx.body = { chatId: created.documentId, reply };
        return;
      }

      const current = await strapi.documents(UID).findOne({
        documentId: chatId,
        populate: { askAnswer: true },
      });
      if (!current) ctx.throw(404, "Chat not found");

      let summary = current.summary || "";
      let history = current.askAnswer || [];

      if (history.length > 20) {
        summary = await createSummary(model, history.slice(0, -8));
        await strapi.documents(UID).update({
          documentId: chatId,
          data: { summary } as any,
        });

        // history = history.slice(-8);
      }

      const reply = await askOpenAI(model, summary, history, message);

      await strapi.documents(UID).update({
        documentId: chatId,
        fields: ["documentId"],
        data: {
          askAnswer: [
            ...history,
            { who: "user", content: message },
            { who: "gpt", content: reply },
          ],
        } as any,
      });

      ctx.body = { chatId, reply };
    } catch (err) {
      console.error("GPT error:", err);
      ctx.throw(500, err.message || "AI request failed");
    }
  },
};
