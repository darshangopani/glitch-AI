import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface VoiceInterfaceProps {
  onCommand: (command: string) => void;
  isProcessing: boolean;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
}

export default function VoiceInterface({ 
  onCommand, 
  isProcessing, 
  isListening, 
  setIsListening 
}: VoiceInterfaceProps) {
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onCommand(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onCommand, setIsListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
       alert("Speech recognition not supported in this browser.");
       return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = () => {
    if (textInput.trim()) {
      onCommand(textInput.trim());
      setTextInput("");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-2 p-2 bg-[#0a0a0a]/80 border border-[#222] rounded-2xl backdrop-blur-md">
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={cn(
            "p-4 rounded-xl transition-all duration-300",
            isListening 
              ? "bg-red-500/20 text-red-500 animate-pulse" 
              : "bg-[#00f2ff]/10 text-[#00f2ff] hover:bg-[#00f2ff]/20"
          )}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={isListening ? "Listening..." : "Type a command or use voice..."}
          disabled={isProcessing}
          className="flex-1 bg-transparent border-none outline-none text-[#e0e0e0] font-mono placeholder:text-[#666]"
        />

        <button
          onClick={handleSend}
          disabled={isProcessing || !textInput.trim()}
          className="p-4 text-[#00f2ff] hover:text-cyan-300 disabled:opacity-20"
        >
          <Send size={24} />
        </button>
      </div>
      
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-center text-[#00f2ff]/50 font-mono text-xs uppercase tracking-widest"
          >
            Voice recognition active
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
