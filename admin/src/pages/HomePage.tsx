import React, { useState } from "react";
import { Button, Textarea, Typography, SingleSelect, SingleSelectOption } from "@strapi/design-system";
import { useAuth } from "@strapi/strapi/admin";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const HomePage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null); // 👈 ID чата из Strapi
  const [model, setModel] = useState("gpt-5-mini");
  const { user } = useAuth('gpt-plugin', (v) => v);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/strapi-gpt-5/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          model,
          chatId,
          personalName: `${user?.firstname} ${user?.lastname}`
        }),
      });

      const data = await res.json();

      if (!chatId && data.chatId) {
        setChatId(data.chatId);
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.reply || "No response" },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error during request" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <div style={{ marginBottom: 16 }}>
        <Typography variant="alpha">GPT-5 for Strapi</Typography>
      </div>

      <div style={{ maxWidth: 200 }}>
        <SingleSelect value={model}  onChange={(val: string | number) => setModel(val as string)}>
          <SingleSelectOption value="gpt-5">GPT-5</SingleSelectOption>
          <SingleSelectOption value="gpt-5-mini">GPT-5 mini</SingleSelectOption>
          <SingleSelectOption value="gpt-5-nano">GPT-5 nano</SingleSelectOption>
        </SingleSelect>
      </div>

      <div
        style={{
          border: "1px solid #444",
          borderRadius: 8,
          padding: 16,
          marginTop: 16,
          marginBottom: 16,
          height: 600,
          overflowY: "auto",
          background: "#1a1a1a",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              textAlign: m.role === "user" ? "right" : "left",

            }}
          >
            <div
               style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontSize: 16,
                  background: m.role === "user" ? "#4a90e2" : "#2d2d2d",
                  color: "#fff",
                  maxWidth: '85%',
                  whiteSpace: "pre-wrap",
                }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div
          style={{
            display: "inline-block",
            fontSize: 16,
            padding: "8px 12px",
            color: "#666363",
          }}
        >
          {'Thinks...'}
        </div>}
      </div>

      <Textarea
        placeholder="Enter answer..."
        value={input}
        onChange={(e: any) => setInput(e.target.value)}
      />

      <Button onClick={sendMessage} loading={loading} style={{ marginTop: 12 }}>
        Send
      </Button>
    </div>
  );
};

export default HomePage;
