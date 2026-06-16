import { motion, AnimatePresence } from "motion/react";
import { Message } from "@/src/types";
import { User, Bot } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface ChatLogProps {
  messages: Message[];
}

export default function ChatLog({ messages }: ChatLogProps) {
  return (
    <div className="flex-1 overflow-y-auto space-y-4 pt-1 pr-1 custom-scrollbar w-full">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex items-start gap-4 mx-auto w-full",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "p-2 rounded border bg-[#0a0a0a]",
              msg.role === 'user' ? "border-[#222] text-[#00f2ff]" : "border-[#00f2ff]/30 text-[#e0e0e0] shadow-[0_0_10px_#00f2ff_inset]"
            )}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={cn(
              "flex-1 p-3 rounded font-mono text-xs leading-relaxed",
              msg.role === 'user' 
                ? "bg-[#111] border border-[#222] text-[#e0e0e0]" 
                : "bg-transparent border border-[#00f2ff]/30 text-[#e0e0e0]"
            )}>
              {msg.content}
              <div className="mt-1 text-[10px] text-[#666] uppercase tracking-tighter text-right">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}
        {messages.length === 0 && (
           <div className="h-full flex items-center justify-center opacity-30 text-xs text-[#666]">
              Awaiting neural link...
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
