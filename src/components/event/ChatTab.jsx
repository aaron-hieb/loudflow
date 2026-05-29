import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function ChatTab({ eventId, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Initial load
    base44.entities.EventMessage.filter({ event_id: eventId }, "created_date", 200).then(setMessages);

    // Real-time subscription
    const unsub = base44.entities.EventMessage.subscribe((event) => {
      if (event.data?.event_id !== eventId) return;
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.find((m) => m.id === event.id)) return prev;
          // Browser notification if not the current user's message
          if (event.data.sender_email !== user?.email) {
            if (Notification.permission === "granted") {
              new Notification(`${event.data.sender_name}`, {
                body: event.data.text,
                icon: "/favicon.ico",
              });
            }
          }
          return [...prev, event.data];
        });
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
      }
    });

    // Request notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => unsub();
  }, [eventId, user?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    await base44.entities.EventMessage.create({
      event_id: eventId,
      text: text.trim(),
      sender_name: user?.full_name || user?.email || "Unknown",
      sender_email: user?.email || "",
    });
    setText("");
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isMe = (msg) => msg.sender_email === user?.email;

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {messages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col", isMe(msg) ? "items-end" : "items-start")}>
            <span className="text-xs text-muted-foreground mb-1 px-1">
              {isMe(msg) ? "You" : msg.sender_name} · {moment(msg.created_date).fromNow()}
            </span>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                isMe(msg)
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end pt-4 border-t border-border">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          className="resize-none min-h-[42px] max-h-32"
          rows={1}
        />
        <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}