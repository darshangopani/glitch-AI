import { useState, useCallback, useEffect, useRef } from "react";
import { Message } from "@/src/types";
import GlitchOrb from "@/src/components/GlitchOrb";
import VoiceInterface from "@/src/components/VoiceInterface";
import ChatLog from "@/src/components/ChatLog";
import { Cpu, ShieldAlert, Terminal, CloudSun, ChevronDown, ChevronUp, Share2, Copy, Download, Check, RefreshCw } from "lucide-react";
import { cn } from "@/src/lib/utils";
const neuralBackdrop = "/src/assets/images/neural_backdrop_1781591002790.jpg";

export interface ModelOption {
  id: string;
  name: string;
  engine: "gemini" | "diffusiongemma" | "minimax";
  modelCode: string;
}

export const MODELS: ModelOption[] = [
  { id: "default", name: "Default (Gemini 3.5 Flash)", engine: "gemini", modelCode: "gemini-2.5-flash" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", engine: "gemini", modelCode: "gemini-2.5-flash" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", engine: "gemini", modelCode: "gemini-1.5-flash-8b" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", engine: "gemini", modelCode: "gemini-2.5-flash" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", engine: "gemini", modelCode: "gemini-2.5-pro" },
  { id: "gemini-pro-latest", name: "Gemini Pro Latest", engine: "gemini", modelCode: "gemini-2.5-pro" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest", engine: "gemini", modelCode: "gemini-2.5-flash" },
  { id: "diffusiongemma", name: "Gemma 26B (a4b)", engine: "diffusiongemma", modelCode: "diffusiongemma-26b-a4b-it" },
  { id: "minimax-abab6.5g", name: "MiniMax abab6.5g", engine: "minimax", modelCode: "abab6.5g-chat" },
  { id: "minimax-abab6.5t", name: "MiniMax abab6.5t", engine: "minimax", modelCode: "abab6.5t-chat" },
  { id: "minimax-abab7", name: "MiniMax abab7-chat", engine: "minimax", modelCode: "abab7-chat" },
];

function useClimateData() {
  const [climate, setClimate] = useState({
    temp: "--",
    condition: "SCANNING",
    location: "SCANNING...",
    windSpeed: "--",
    windDirection: "--",
    humidity: "--",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    async function fetchClimate() {
      try {
        const geoRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
        const geoData = await geoRes.json();
        const lat = geoData.latitude || "21.17";
        const lon = geoData.longitude || "72.83";
        const city = geoData.city || "LOCAL NODE";

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m`
        );
        const weatherData = await weatherRes.json();
        const current = weatherData.current || {};

        // WMO weather code to condition
        const code = current.weather_code !== undefined ? current.weather_code : 0;
        let condText = "CLEAR";
        if (code >= 1 && code <= 3) condText = "CLOUDY";
        else if (code >= 45 && code <= 48) condText = "FOG";
        else if (code >= 51 && code <= 67) condText = "RAIN";
        else if (code >= 71 && code <= 77) condText = "SNOW";
        else if (code >= 95) condText = "STORM";

        const windDirDegrees = current.wind_direction_10m || 0;
        const windDirectionStrings = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        const index = Math.floor((windDirDegrees / 22.5) + 0.5);
        const windDirStr = windDirectionStrings[index % 16];

        setClimate({
          temp: current.temperature_2m !== undefined ? Math.round(current.temperature_2m).toString() : "--",
          condition: condText,
          location: city.toUpperCase(),
          windSpeed: current.wind_speed_10m !== undefined ? Math.round(current.wind_speed_10m).toString() : "--",
          windDirection: windDirStr,
          humidity: current.relative_humidity_2m !== undefined ? current.relative_humidity_2m.toString() : "75",
          latitude: parseFloat(lat).toFixed(4),
          longitude: parseFloat(lon).toFixed(4),
        });
      } catch (err) {
        setClimate(c => ({ ...c, condition: "OFFLINE", location: "SURAT" }));
      }
    }
    fetchClimate();
  }, []);

  return climate;
}

function useSystemData() {
  const [data, setData] = useState({
    cores: navigator.hardwareConcurrency || 4,
    memory: (navigator as any).deviceMemory || 8,
    platform: navigator.platform || 'Unknown',
    batteryLevel: "100%",
    batteryCharging: true,
    localIp: "127.0.0.1"
  });

  useEffect(() => {
    // Battery API (not supported in all browsers)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setData(d => ({
            ...d,
            batteryLevel: `${Math.round(battery.level * 100)}%`,
            batteryCharging: battery.charging
          }));
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      });
    }

    // Try to get public IP to look cooler
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(res => setData(d => ({ ...d, localIp: res.ip })))
      .catch(() => {});
  }, []);

  return data;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioData, setAudioData] = useState<number[]>(new Array(10).fill(0));
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODELS[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Custom toast notification state
  const [toast, setToast] = useState<string | null>(null);
  
  // Dynamic high-fidelity streaming neural logs
  const [neuralLogs, setNeuralLogs] = useState<{ id: string; time: string; text: string }[]>([
    { id: "1", time: "14:02:11", text: "SYNC_PACKET_Rcvd: ID=G872" },
    { id: "2", time: "14:02:12", text: "COGNITIVE_THREAD_LOAD: 88%" },
    { id: "3", time: "14:02:13", text: "MEM_MAP_INIT: BLOCK_0x4F" },
    { id: "4", time: "14:02:15", text: "VOICE_PORT_OPEN: RX_SAMPLE_RATE=16K" },
    { id: "5", time: "14:02:18", text: "AUDIO_GAIN_STABLE: VALUE=+4.2dB" },
  ]);

  // Telemetry stream effect
  useEffect(() => {
    const diagnosticPhrases = [
      "SYNAPSE_LINK_STABLE: STRENGTH=98.7%",
      "COGNITIVE_THREAD_LOAD: 42%",
      "BUFFER_FLUSH_COMPLETE: COMPACTED=12KB",
      "SYS_KERNEL_EXEC: INTERRUPT_VECTOR=0xE1",
      "VOLTAGE_REGULATOR_POLL: OPTIMAL_CURRENT=true",
      "ATMOS_BAROMETER_POLL: SEALEVEL_HPA=1013",
      "VOICE_PITCH_FILTER_RELOAD: ENGAGED=true",
      "QUANTUM_STATE_ALIGNMENT: RATIO=1.000",
      "CACHE_INDEX_REBUILT: SECTORS=512_OK",
      "NEURAL_EMBEDDING_PULSE: FREQ=8.4Hz",
      "MINIMAX_ROUTING_ACK: LATENCY=24ms",
      "FRAME_DECODE_CRC: MATCH=true",
      "GEOLOCATION_COORDINATES_LOCKED: LAT_21.17_LONG_72.83",
      "CLIMATE_AMBIENT_PROBE: VALUE=32_CELSIUS",
      "HARDWARE_DIE_TEMPERATURE: CORES_STABLE=39C",
    ];

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour12: false });
      const randomText = diagnosticPhrases[Math.floor(Math.random() * diagnosticPhrases.length)];
      setNeuralLogs(prev => {
        const next = [...prev, { id: Math.random().toString(), time: timeStr, text: randomText }];
        if (next.length > 35) next.shift(); // keep matching screenshot visual density
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Show a toast helper
  const showNotification = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const sysData = useSystemData();
  const climateData = useClimateData();

  const handleCommand = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    // Append user input to logs
    const nowStr = new Date().toLocaleTimeString([], { hour12: false });
    setNeuralLogs(prev => [
      ...prev, 
      { id: Math.random().toString(), time: nowStr, text: `USER_COMMAND_RECEIVED: "${text.toUpperCase().slice(0, 25)}..."` }
    ]);

    try {
      const response = await fetch("/api/glitch/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          command: text, 
          engine: selectedModel.engine,
          model: selectedModel.modelCode,
          history: messagesRef.current,
          systemContext: {
            cores: sysData.cores,
            memory: sysData.memory,
            platform: sysData.platform,
            batteryLevel: sysData.batteryLevel,
            batteryCharging: sysData.batteryCharging,
            localIp: sysData.localIp,
            localTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          climateContext: {
            location: climateData.location,
            temp: climateData.temp,
            condition: climateData.condition,
            humidity: climateData.humidity,
            latitude: climateData.latitude,
            longitude: climateData.longitude,
            windSpeed: climateData.windSpeed,
            windDirection: climateData.windDirection
          }
        })
      });

      const data = await response.json();
      
      const glitchMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: data.text || data.error || "Command processed. No output generated.",
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, glitchMsg]);

      // Append assistant answer trace to logs
      const endStr = new Date().toLocaleTimeString([], { hour12: false });
      setNeuralLogs(prev => [
        ...prev, 
        { id: Math.random().toString(), time: endStr, text: `AI_RESPONSE_SYNCHRONIZED: SUCCESS` }
      ]);

      // Interrupt/stop any currently playing text-to-speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }

      // High-fidelity ElevenLabs voice synthesis handler
      const playElevenLabsVoice = async (phrase: string) => {
        try {
          const ttsResponse = await fetch("/api/glitch/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: phrase })
          });

          const contentType = ttsResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const ttsData = await ttsResponse.json();
            if (ttsData.fallback) {
              console.warn("ElevenLabs environment fallback: using local synthesize stream", ttsData.message);
              playLocalSpeechFallback(phrase);
            }
          } else {
            const blob = await ttsResponse.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            activeAudioRef.current = audio;
            await audio.play();

            const playStr = new Date().toLocaleTimeString([], { hour12: false });
            setNeuralLogs(prev => [
              ...prev, 
              { id: Math.random().toString(), time: playStr, text: "ELEVENLABS_AUDIO_STREAM: CONNECTED" }
            ]);
          }
        } catch (err) {
          console.warn("Failed to stream ElevenLabs high fidelity, playing default synthesis:", err);
          playLocalSpeechFallback(phrase);
        }
      };

      const playLocalSpeechFallback = (phrase: string) => {
        if ('speechSynthesis' in window && phrase) {
          const utterance = new SpeechSynthesisUtterance(phrase);
          utterance.rate = 1.1;
          utterance.pitch = 0.8; // Pitch of the system kernel
          window.speechSynthesis.speak(utterance);
        }
      };

      if (glitchMsg.content && !data.error) {
        playElevenLabsVoice(glitchMsg.content);
      }

    } catch (error) {
      console.error("Glitch Communication Error:", error);
      setMessages(prev => [...prev, {
        id: "err",
        role: 'assistant',
        content: "CRITICAL ERROR: Neural link severed. Please check server logs.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedModel]);

  // COPY LOGS UTILITY
  const handleCopyLogs = () => {
    let textToCopy = `=== GLITCH.AI NEURAL DATABASE REAL-TIME EXPORT ===\n`;
    textToCopy += `Timestamp: ${new Date().toLocaleString()}\n`;
    textToCopy += `Active AI Engine: ${selectedModel.name}\n\n`;
    
    textToCopy += `--- LOCAL SYSTEM DIAGNOSTICS ---\n`;
    neuralLogs.forEach(l => {
      textToCopy += `[${l.time}] ${l.text}\n`;
    });
    
    textToCopy += `\n--- USER RECENT CONTEXT WINDOW ---\n`;
    if (messages.length === 0) {
      textToCopy += `[Awaiting neural link conversations_]\n`;
    } else {
      messages.forEach(m => {
        textToCopy += `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role === "user" ? "USER" : "SYSTEM"}: ${m.content}\n`;
      });
    }
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        showNotification("[SYSTEM] TELEMETRY BUFFER FLUSHED TO LOCAL CLIPBOARD_");
      })
      .catch(() => {
        showNotification("[ERROR] BUFFER FLUSH SECURE EXCEPTION_");
      });
  };

  // SHARE / BROADCAST LOGS UTILITY
  const handleShareLogs = () => {
    const uniqueNode = Math.random().toString(36).substring(4, 8).toUpperCase();
    const fakeBroadcastUrl = `https://g-server.internal/node_${uniqueNode}/telemetry_sync`;
    navigator.clipboard.writeText(fakeBroadcastUrl)
      .then(() => {
        showNotification(`[NET] SECURE DIRECTORY BROADCAST COPIED TO NODE_${uniqueNode}_`);
      })
      .catch(() => {
        showNotification("[ERROR] BROADCAST ENCRYPTION TIMEOUT_");
      });
  };

  // DOWNLOAD LOGS UTILITY
  const handleDownloadLogs = () => {
    let fileContent = `=== GLITCH.AI SYSTEM LOG ARCHIVE ===\n`;
    fileContent += `Date: ${new Date().toUTCString()}\n`;
    fileContent += `Cores: ${sysData.cores}\n`;
    fileContent += `Memory: ${sysData.memory} GB\n`;
    fileContent += `Local Node IP: ${sysData.localIp}\n\n`;
    
    fileContent += `--- TELEMETRY TRACES ---\n`;
    neuralLogs.forEach(l => {
      fileContent += `[${l.time}] ${l.text}\n`;
    });
    
    fileContent += `\n--- DIALOGUE RECORDINGS ---\n`;
    messages.forEach(m => {
      fileContent += `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role === "user" ? "USER" : "GLITCH.AI"}: ${m.content}\n`;
    });
    
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `glitch_kernel_log_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("[DISK] TELEMETRY ARCHIVE WRITTEN TO LOCAL DIRECTORY_");
  };

  return (
    <div 
      className="flex flex-col h-screen w-full bg-neutral-950 text-[#e0e0e0] font-mono p-4 md:p-6 gap-6 overflow-hidden relative"
      style={{
        backgroundImage: `url(${neuralBackdrop})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div 
        className="absolute inset-0 bg-[#020202f2]/95 sm:bg-[#030302e3]/92 z-0 pointer-events-none" 
        style={{
          boxShadow: "inset 0 0 120px rgba(0,0,0,0.95)"
        }}
      />
      {/* Header */}
      <header className="flex justify-between items-end border-b border-[#333] pb-4 shrink-0 z-50 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#666] tracking-[0.2em] uppercase">System Kernel v4.2.0</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#00f2ff] shadow-[#00f2ff] drop-shadow-sm flex items-center gap-3">
             <Cpu className="text-[#00f2ff] hidden md:block" size={24} />
             GLITCH.AI
          </h1>
        </div>

        {/* AI Model Selector Dropdown */}
        <div className="flex flex-col items-start relative select-none" ref={dropdownRef}>
          <span className="text-[10px] text-[#666] uppercase mb-1 tracking-widest">Select model for chat</span>
          
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-between w-52 md:w-64 bg-[#121212] border border-[#262626] hover:border-[#444] rounded-lg px-3 py-2 text-xs md:text-sm font-medium text-[#e0e0e0] cursor-pointer transition-all focus:outline-none"
          >
            <span className="flex items-center gap-2">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                selectedModel.engine === "gemini" && "bg-[#00f2ff] shadow-[0_0_6px_#00f2ff]",
                selectedModel.engine === "diffusiongemma" && "bg-amber-500 shadow-[0_0_6px_#f59e0b]",
                selectedModel.engine === "minimax" && "bg-emerald-500 shadow-[0_0_6px_#10b981]"
              )} />
              {selectedModel.name}
            </span>
            <ChevronDown size={14} className={cn("text-[#666] transition-transform duration-200", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 w-52 md:w-64 bg-[#0a0a0a] border border-[#262626] rounded-lg shadow-2xl z-[100] py-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer",
                    selectedModel.id === model.id 
                      ? "bg-neutral-800 text-white font-bold" 
                      : "text-neutral-400 hover:bg-[#161616] hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn(
                      "w-1 h-1 rounded-full",
                      model.engine === "gemini" && "bg-[#00f2ff]",
                      model.engine === "diffusiongemma" && "bg-[#f59e0b]",
                      model.engine === "minimax" && "bg-[#10b981]"
                    )} />
                    {model.name}
                  </span>
                  
                  {/* Subtle Engine Badge */}
                  <span className={cn(
                    "text-[8px] uppercase tracking-wider px-1 py-0.5 rounded border opacity-60",
                    model.engine === "gemini" && "text-[#00f2ff] border-[#00f2ff]/30 bg-[#00f2ff]/5",
                    model.engine === "diffusiongemma" && "text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/5",
                    model.engine === "minimax" && "text-[#10b981] border-[#10b981]/30 bg-[#10b981]/5"
                  )}>
                    {model.engine === "diffusiongemma" ? "gemma" : model.engine}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Toolbar on the right, matching with screenshot */}
        <div className="flex flex-col items-end gap-1 px-1">
          {/* Privilege status badge */}
          <div className="flex items-center gap-2 text-[#22c55e] bg-emerald-950/20 border border-emerald-920/10 px-3 py-1 rounded-full select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-[9px] font-bold font-mono tracking-widest uppercase truncate">Privileged Access</span>
          </div>
        </div>
      </header>

      {/* Main Bento Grid */}
      <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 z-10 w-full relative overflow-y-auto md:overflow-hidden pb-4 md:pb-0">
        {/* Core Visualizer (Large Central Area) */}
        <div className="col-span-1 md:col-span-8 row-span-4 bg-[#08080bf0]/90 md:bg-[#07070af0]/80 border border-zinc-800/80 rounded-xl flex flex-col items-center justify-between pb-8 pt-4 px-4 relative overflow-hidden shadow-2xl backdrop-blur-md transition-all hover:border-zinc-700/60 z-10">
          {/* Header row elements shown in screenshot details */}
          <div className="absolute top-4 left-4 text-[10px] text-[#444] uppercase z-10 flex items-center gap-2 select-none font-mono">
            <span>Input: Natural Language Voice</span>
            <span className="text-zinc-800">|</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
            <span className="text-emerald-500 font-bold tracking-wider">Neural Architecture Active</span>
            <span className="text-zinc-800">-</span>
            <span className="text-zinc-500">Model Synchronized</span>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <GlitchOrb 
              isListening={isListening} 
              isProcessing={isProcessing} 
              onAudioData={(data) => {
                 // Convert 32 bins array to 10 bins for the bottom waveform
                 if (data.length >= 10) {
                   const reduced = [];
                   const step = Math.floor(data.length / 10);
                   for(let i = 0; i < 10; i++) {
                      reduced.push(data[i * step]);
                   }
                   setAudioData(reduced);
                 }
              }}
            />
            
            <div className="mt-8 text-center max-w-lg w-full px-4">
               <p className="text-[#00f2ff] text-xl font-medium tracking-tight h-8 truncate filter drop-shadow-[0_0_8px_rgba(0,242,255,0.3)] font-mono">
                 {messages.length > 0 && messages[messages.length-1].role === 'user' 
                   ? `[ "${messages[messages.length-1].content.toUpperCase()}" ]` 
                   : (messages.length > 0 && messages[messages.length-1].role === 'assistant'
                     ? `"${messages[messages.length-1].content.toUpperCase().slice(0, 60)}${messages[messages.length-1].content.length > 60 ? "..." : ""}"`
                     : "")}
               </p>
               <p className="text-[#666] text-xs mt-2 h-4 uppercase tracking-widest font-mono">
                 {isListening ? `Listening... Ambient gain adjusted (+4.2dB)` : (isProcessing ? "Processing neural link..." : "Idle. Waiting for command_")}
               </p>
            </div>
          </div>

          <div className="w-full relative z-20 mt-4">
            <VoiceInterface 
              onCommand={handleCommand} 
              isProcessing={isProcessing}
              isListening={isListening}
              setIsListening={setIsListening}
            />
          </div>

          {/* Waveform Simulation (dynamic) */}
          <div className="absolute bottom-0 w-full flex items-end justify-center gap-1 h-32 px-12 opacity-10 pointer-events-none">
            {audioData.map((val, i) => (
               <div 
                 key={i} 
                 className="bg-[#00f2ff] w-2 transition-all duration-75" 
                 style={{ height: `${Math.max(4, val * 100)}%` }} 
               />
            ))}
          </div>
        </div>

        {/* Neural Log Queue - Displays flowing system records exactly as pictured */}
        <div className="col-span-1 md:col-span-4 row-span-4 bg-[#08080bf0]/90 md:bg-[#07070af0]/80 border border-zinc-800/80 rounded-xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-md transition-all hover:border-zinc-700/60 z-10">
          <div className="px-5 pt-5 pb-3">
            <div className="text-[10px] text-[#666] uppercase tracking-widest border-b border-[#222] pb-2 flex justify-between select-none">
              <span>Neural Data Log</span>
              <span className="text-[#00f2ff] font-bold">
                 {neuralLogs.length} RECORDS
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar font-mono text-[11px] leading-relaxed space-y-2 text-neutral-400">
             {neuralLogs.map((log) => (
                <div key={log.id} className="flex gap-2.5 items-start hover:text-[#00f2ff] transition-colors select-none animate-[fadeIn_0.4s_ease-out]">
                  <span className="text-[#444] shrink-0 font-mono">[{log.time}]</span>
                  <span className="text-[#10b981] font-bold shrink-0 font-mono">●</span>
                  <span className="break-all font-mono tracking-tight text-neutral-300">{log.text}</span>
                </div>
             ))}
             {neuralLogs.length === 0 && (
                <div className="h-full flex items-center justify-center opacity-30 text-xs text-[#666]">
                   Awaiting neural link...
                </div>
             )}
          </div>
        </div>

        {/* System Stats Block 1 - Hardware Limit */}
        <div className="col-span-1 md:col-span-2 row-span-2 bg-[#08080bf0]/90 md:bg-[#07070af0]/80 border border-zinc-800/80 rounded-xl p-4 hidden sm:flex flex-col justify-between relative overflow-hidden shadow-2xl backdrop-blur-md transition-all hover:border-zinc-700/60 z-10">
          <div className="text-[10px] text-[#666] uppercase border-b border-[#222] pb-1.5 select-none font-mono">Hardware Limit</div>
          <div className="flex justify-between items-center flex-1 py-1">
            <div className="flex flex-col gap-1 z-10">
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono">{sysData.cores}<span className="text-[10px] text-zinc-500 ml-1 uppercase font-mono">Cores</span></div>
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono">{sysData.memory}<span className="text-[10px] text-zinc-500 ml-1 uppercase font-mono">GB RAM</span></div>
            </div>
            
            {/* 12 chip cores microgrid shown in screenshot */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950/80 border border-zinc-900 rounded select-none pointer-events-none self-center shadow-inner">
              {Array.from({ length: 12 }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-2.5 h-2.5 rounded-xs transition-all duration-300",
                    i % 3 === 0
                      ? "bg-cyan-500/80 shadow-[0_0_4px_#00f2ff] animate-pulse"
                      : i % 4 === 1
                      ? "bg-emerald-500/60 shadow-[0_0_4px_#10b981]"
                      : "bg-[#1d1d1d]"
                  )} 
                />
              ))}
            </div>
          </div>
          <div className="text-[10px] text-emerald-500 uppercase flex items-center gap-1 select-none font-mono font-bold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ARCH: {sysData.platform}
          </div>
        </div>

        {/* System Stats Block 2 - Power / Response */}
        <div className="col-span-1 md:col-span-3 row-span-2 bg-[#08080bf0]/90 md:bg-[#07070af0]/80 border border-zinc-800/80 rounded-xl p-4 hidden sm:flex flex-col justify-between relative overflow-hidden shadow-2xl backdrop-blur-md transition-all hover:border-zinc-700/60 z-10">
          <div className="text-[10px] text-[#666] uppercase border-b border-[#222] pb-1.5 select-none font-mono">Power / Response</div>
          <div className="flex justify-between items-center flex-1 py-1">
            <div className="flex flex-col gap-1 z-10">
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono">{sysData.batteryLevel}<span className="text-[10px] text-[#444] ml-1 uppercase font-mono">BATTERY</span></div>
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono">{isProcessing ? "420" : "14"}<span className="text-[10px] text-zinc-500 ml-1 uppercase font-mono">ms LATENCY</span></div>
            </div>
            
            {/* Hand-crafted gorgeous vertical floating battery graphic */}
            <div className="flex items-center gap-2 pr-1 select-none pointer-events-none">
              <div className="w-10 h-16 border border-zinc-700 rounded bg-[#090909] flex items-end p-0.5 relative shadow-[0_0_8px_rgba(0,0,0,0.8)]">
                {/* Cap top terminal */}
                <div className="w-4 h-1 bg-zinc-700 absolute -top-1 left-1/2 -translate-x-1/2 rounded-t-xs" />
                
                {/* Glowing fluid block representing fill capacity */}
                <div 
                  className="w-full bg-[#10b981]/50 border-t border-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.5)] rounded-2xs relative overflow-hidden animate-pulse"
                  style={{ height: sysData.batteryLevel }}
                >
                  <div className="absolute top-0 w-full h-full bg-[linear-gradient(to_top,#10b981/15,transparent)]" />
                  <div className="absolute -top-1 left-1.5 w-1 h-1 bg-emerald-300 rounded-full animate-ping" />
                  <div className="absolute top-3 left-4 w-1 h-1 bg-emerald-300 rounded-full opacity-60 animate-bounce" />
                </div>
                
                {/* Glowing bottom right terminal LED marker */}
                <span className="absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-zinc-950 shadow-[0_0_6px_#10b981]" />
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-neutral-400 flex items-center justify-between uppercase select-none font-mono">
            <span className="flex items-center gap-1 font-bold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-pulse" />
              {isProcessing ? "High Load" : "Optimal Ping"}
            </span>
            
            {/* Mini sparkline graphic exactly like the screenshot battery chart */}
            <svg className="w-14 h-4 text-[#00f2ff] opacity-80" viewBox="0 0 100 20">
              <path 
                d="M 0 10 L 15 10 L 25 3 L 35 17 L 45 7 L 55 13 L 65 3 L 75 10 L 100 10" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="animate-[pulse_1.5s_infinite]"
              />
            </svg>
          </div>
        </div>

        {/* Live Climate Detector - Atmos Array */}
        <div className="col-span-1 md:col-span-3 row-span-2 bg-[#08080bf0]/90 md:bg-[#07070af0]/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group min-h-[140px] shadow-2xl backdrop-blur-md transition-all hover:border-zinc-700/60 z-10">
          <div className="text-[10px] text-[#666] uppercase border-b border-[#222] pb-1.5 flex justify-between items-center select-none font-mono">
            <span>Atmos Array</span>
            <span className="text-[#00f2ff] opacity-70 animate-pulse"><CloudSun size={12} /></span>
          </div>
          <div className="flex justify-between items-center flex-1 py-1">
            <div className="flex flex-col relative z-10 select-none">
              <div className="flex items-end gap-1">
                <span className="text-3xl md:text-4xl font-bold font-sans tracking-tight text-white group-hover:text-[#00f2ff] transition-colors">{climateData.temp}</span>
                <span className="text-lg text-zinc-500 pb-1 font-mono">°C</span>
              </div>
              <div className="text-xs md:text-sm font-bold text-[#00f2ff] tracking-widest uppercase mt-0.5 font-mono">{climateData.condition}</div>
            </div>
            
            {/* Glowing neon sun clouds overlapping */}
            <div className="relative w-14 h-14 flex items-center justify-center select-none pointer-events-none pr-1">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-[spin_10s_linear_infinite]" />
              <div className="absolute -bottom-1 -right-1 z-10 text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                <CloudSun size={28} />
              </div>
            </div>
          </div>
          
          <div className="text-[9px] text-[#555] font-mono flex flex-col uppercase gap-0.5 select-none font-mono">
            <div className="flex justify-between">
              <span>LOCATION: {climateData.location}</span>
              <span className="text-emerald-500/90 font-bold font-mono">{climateData.condition} ({climateData.humidity}% HUMIDITY)</span>
            </div>
            <div className="flex justify-between text-zinc-500 font-mono">
              <span>GRID: {climateData.latitude ? `${climateData.latitude}°N` : "21.17°N"} {climateData.longitude ? `${climateData.longitude}°E` : "72.83°E"}</span>
              <span>WIND: {climateData.windSpeed} km/h {climateData.windDirection}</span>
            </div>
          </div>
          {/* Decorative radar sweep background */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#00f2ff]/5 rounded-full blur-xl animate-pulse pointer-events-none" />
        </div>

        {/* Recent Context Window - Dialog Logs Panel */}
        <div className="col-span-1 md:col-span-4 row-span-2 bg-[#08080bf0]/90 md:bg-[#07070af0]/80 border border-zinc-800/80 rounded-xl p-5 hidden md:flex flex-col overflow-hidden shadow-2xl backdrop-blur-md transition-all hover:border-zinc-700/60 z-10">
          <div className="text-[10px] text-[#666] uppercase mb-3 tracking-widest border-b border-[#222] pb-1.5 flex justify-between select-none font-mono">
            <span>Recent Context Window</span>
            <span className="text-[#00f2ff]/60 text-[9px] uppercase font-bold font-mono">Active Session</span>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
            {messages.slice(-4).map((msg) => (
              <div key={msg.id} className={cn(
                "flex gap-3 items-start text-[11px] leading-relaxed border-l-2 pl-2.5 animate-[fadeIn_0.3s_ease-out]",
                msg.role === 'user' ? "border-[#00f2ff]/50 bg-[#00f2ff]/5" : "border-emerald-500/50 bg-emerald-500/5"
              )}>
                <span className="text-[#555] whitespace-nowrap shrink-0 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], {hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"})}</span>
                <span className={cn("font-bold uppercase shrink-0 font-mono", msg.role === 'user' ? "text-[#00f2ff]" : "text-emerald-500")}>
                  {msg.role === 'user' ? 'User:' : 'System:'}
                </span>
                <span className="text-[#ddd] break-words font-mono font-medium">"{msg.content}"</span>
              </div>
            ))}
            {messages.length === 0 && (
              <>
                <div className="flex gap-3 items-start text-[11px] border-l-2 border-[#222] pl-2.5 opacity-40 text-[#666] select-none font-mono">
                  <span className="text-[#444] whitespace-nowrap">14:01:58</span>
                  <span className="font-bold uppercase text-neutral-500 font-mono font-bold">System:</span>
                  <span className="font-mono">INITIALIZATION SEQUENCE COMPLETE_</span>
                </div>
                <div className="flex gap-3 items-start text-[11px] border-l-2 border-[#222] pl-2.5 opacity-30 text-[#666] select-none font-mono">
                  <span className="text-[#444] whitespace-nowrap">14:01:59</span>
                  <span className="font-bold uppercase text-neutral-500 font-mono font-bold">Core:</span>
                  <span className="font-mono">AWAITING SYNAPSE VOICE CONNECTION PARAMETERS_</span>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer Bar */}
      <footer className="flex justify-between items-center text-[8px] md:text-[10px] text-[#333] border-t border-[#111] pt-4 uppercase tracking-[0.3em] shrink-0 z-50">
        <div>Local Node: {sysData.localIp}</div>
        <div className="flex gap-4 md:gap-6">
          <span className="text-[#666] hidden md:inline">Neural Sync: Active</span>
          <span className="text-[#666] hidden md:inline">Voice Engine: Ready</span>
          <span className="text-[#00f2ff] glitch-text">Ready for input_</span>
        </div>
      </footer>
    </div>
  );
}

