import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface GlitchOrbProps {
  isListening: boolean;
  isProcessing: boolean;
  onAudioData?: (data: number[]) => void;
}

export default function GlitchOrb({ isListening, isProcessing, onAudioData }: GlitchOrbProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioData, setAudioData] = useState<number[]>(new Array(32).fill(0.15));
  const requestRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const timeRef = useRef<number>(0);

  // Brain node coordinates (symmetrical, matching a futuristic human brain silhouette)
  const brainNodes = [
    { x: 38, y: 32, label: "FRONTAL_L" }, { x: 45, y: 27, label: "FRNT_C1" }, 
    { x: 55, y: 27, label: "FRNT_C2" }, { x: 62, y: 32, label: "FRONTAL_R" },
    { x: 30, y: 42, label: "TEMPORAL_L1" }, { x: 42, y: 39, label: "PARIETAL_L1" }, 
    { x: 50, y: 36, label: "CORE_SYNAPSE" }, { x: 58, y: 39, label: "PARIETAL_R1" }, 
    { x: 70, y: 42, label: "TEMPORAL_R1" },
    { x: 32, y: 54, label: "TEMPORAL_L2" }, { x: 43, y: 50, label: "PARIETAL_L2" }, 
    { x: 50, y: 46, label: "SAGITTAL" }, { x: 57, y: 50, label: "PARIETAL_R2" }, 
    { x: 68, y: 54, label: "TEMPORAL_R2" },
    { x: 40, y: 64, label: "OCCIPITAL_L" }, { x: 50, y: 60, label: "CENTRAL_SULCUS" }, 
    { x: 60, y: 64, label: "OCCIPITAL_R" },
    { x: 46, y: 74, label: "CEREBELLUM_L" }, { x: 54, y: 74, label: "CEREBELLUM_R" }, 
    { x: 50, y: 82, label: "STEM" }
  ];

  // Map neural wires to outline the lobes
  const brainConnections = [
    [0, 1], [1, 2], [2, 3], [0, 4], [3, 8],
    [4, 5], [5, 6], [6, 7], [7, 8],
    [4, 9], [8, 13], [5, 10], [7, 12], [6, 11],
    [9, 10], [10, 11], [11, 12], [12, 13],
    [9, 14], [13, 16], [10, 15], [12, 15],
    [14, 15], [15, 16], [14, 17], [16, 18],
    [17, 19], [18, 19], [17, 18], [11, 15], [6, 11]
  ];

  // Start audio recording and frequency analysis if listening
  useEffect(() => {
    let active = true;

    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // balanced bins
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        const updateAudio = () => {
          if (!active) return;
          if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            let sum = 0;
            const length = dataArrayRef.current.length;
            for (let i = 0; i < length; i++) {
              sum += dataArrayRef.current[i];
            }
            const average = sum / length;
            // Soft responsive normalization
            const normalized = Math.min(1.5, Math.pow(average / 100, 1.2));
            setAudioLevel(normalized);

            // Fetch frequency data bins (32 bins for beautiful waveform symmetry)
            const bins: number[] = [];
            for (let i = 0; i < 32; i++) {
              const val = dataArrayRef.current[Math.floor(i * (length / 32))] / 255;
              bins.push(Math.max(0.08, val));
            }
            setAudioData(bins);
            if (onAudioData) onAudioData(bins);
          }
          requestRef.current = requestAnimationFrame(updateAudio);
        };

        updateAudio();
      } catch (err) {
        console.warn("Microphone access denied or unavailable, using high-fidelity fallback stimulation:", err);
        startAmbientSimulation();
      }
    };

    // Simulated wave sweep for ambient standby/idle mode
    const startAmbientSimulation = () => {
      const simulate = () => {
        if (!active) return;
        timeRef.current += 1.5;
        const simulatedBins: number[] = [];
        for (let i = 0; i < 32; i++) {
          // Beautiful scrolling wave formula
          const offset = i * 0.4;
          const noise = Math.sin((timeRef.current * 0.05) + offset) * 0.35 + 0.4;
          const pulseSpeed = isProcessing ? 0.25 : 0.08;
          const breath = Math.sin(timeRef.current * pulseSpeed) * 0.15 + 0.25;
          simulatedBins.push(Math.max(0.06, (noise * 0.6) + (breath * 0.4)));
        }
        setAudioData(simulatedBins);
        if (onAudioData) onAudioData(simulatedBins);
        requestRef.current = requestAnimationFrame(simulate);
      };
      simulate();
    };

    const cleanup = () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };

    if (isListening) {
      startAudio();
    } else {
      startAmbientSimulation();
    }

    return cleanup;
  }, [isListening, isProcessing]);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-around w-full gap-8 py-2 md:py-4 select-none px-4 md:px-8 relative min-h-[220px]">
      
      {/* 1. Left Side: Futuristic Symmetrical Soundwave / Voice Interface Oscilloscope */}
      <div className="flex-1 w-full max-w-sm flex flex-col justify-center relative">
        <div className="text-[9px] text-[#444] font-mono mb-2 uppercase tracking-widest text-left select-none pl-1">
          {isListening ? "Voice Link Active: +4.2dB" : "Signal Standby: Lobe Sweep"}
        </div>
        
        <div className="relative h-28 w-full flex items-center justify-between px-2 bg-black/30 border border-zinc-900/60 rounded-xl overflow-hidden backdrop-blur-xs">
          {/* Symmetrical centerline axis */}
          <div className="absolute w-full h-[1px] bg-[#00f2ff]/20 left-0 top-1/2 -translate-y-1/2 border-dashed z-0" />
          
          {/* Dynamic Spectrum Bars */}
          <div className="flex items-center justify-between w-full h-full gap-[4px] relative z-10 px-2">
            {audioData.slice(0, 24).map((val, i) => {
              // Create symmetrical mirrored scaling
              const heightMultiplier = isListening ? 100 : (isProcessing ? 80 : 55);
              const barHeight = Math.max(3, val * heightMultiplier);
              const isCenterBar = i >= 8 && i <= 16;
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-center h-full">
                  {/* Top Bar Segment */}
                  <motion.div 
                    animate={{ height: `${barHeight / 2}px` }}
                    transition={{ type: "tween", duration: 0.05 }}
                    className={cn(
                      "w-[3px] rounded-t-xs transition-colors duration-200",
                      isProcessing 
                        ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
                        : (isListening && isCenterBar
                          ? "bg-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.8)]"
                          : "bg-cyan-500/80 shadow-[0_0_6px_rgba(0,242,255,0.3)]")
                    )}
                  />
                  {/* Hollow core gap center */}
                  <div className="h-[2px]" />
                  {/* Bottom Bar Segment */}
                  <motion.div 
                    animate={{ height: `${barHeight / 2}px` }}
                    transition={{ type: "tween", duration: 0.05 }}
                    className={cn(
                      "w-[3px] rounded-b-xs transition-colors duration-200",
                      isProcessing 
                        ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
                        : (isListening && isCenterBar
                          ? "bg-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.8)]"
                          : "bg-cyan-500/80 shadow-[0_0_6px_rgba(0,242,255,0.3)]")
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* SMR Sweep Scanning overlay laser */}
          <motion.div 
            animate={{ x: ["-10%", "110%"] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
            className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-[#00f2ff]/60 to-transparent shadow-[0_0_8px_#00f2ff] pointer-events-none"
          />
        </div>
      </div>

      {/* 2. Right Side: Multi-layered Rotating HUD Circle & Neural Network Brain Grid */}
      <div className="relative w-56 h-56 flex items-center justify-center shrink-0">
        
        {/* Background glow shadow */}
        <motion.div
          animate={{
            scale: isListening ? [1, 1.12, 1] : [1, 1.03, 1],
            opacity: isListening ? 0.35 : 0.2
          }}
          transition={{ repeat: Infinity, duration: isListening ? 0.8 : 3.5, ease: "easeInOut" }}
          className={cn(
            "absolute inset-4 rounded-full blur-2xl transition-colors duration-300 pointer-events-none",
            isProcessing ? "bg-purple-500/30" : "bg-[#00f2ff]/30"
          )}
        />

        {/* HUD Ring Layer 1: Outer static thin grid dashed ticks */}
        <div className="absolute inset-0 border border-cyan-500/10 rounded-full pointer-events-none" />

        {/* HUD Ring Layer 2: Fast rotating outer ticks index */}
        <svg 
          className={cn(
            "absolute w-full h-full pointer-events-none select-none transition-colors duration-300",
            isProcessing ? "text-purple-500/30" : "text-cyan-500/30"
          )}
          style={{ transform: `rotate(${timeRef.current * 0.1}deg)`}}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="1 3 2 4 1 2"
          />
        </svg>

        {/* HUD Ring Layer 3: Slow opposite segmented primary ring border */}
        <svg 
          className={cn(
            "absolute w-[91%] h-[91%] pointer-events-none select-none transition-colors duration-300",
            isProcessing ? "text-purple-500/60" : "text-[#00f2ff]/50"
          )}
          style={{ transform: `rotate(${-timeRef.current * 0.05}deg)`}}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="25 6 12 4 80 10 30 8"
          />
        </svg>

        {/* HUD Ring Layer 4: Micro technical compass ticks */}
        <svg 
          className="absolute w-[82%] h-[82%] text-zinc-800/80 pointer-events-none select-none animate-[spin_50s_linear_infinite]"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="0.5 2"
          />
        </svg>

        {/* Radar SONAR Sweep Overlay scan */}
        <div 
          className="absolute inset-[9%] rounded-full overflow-hidden pointer-events-none select-none opacity-40"
          style={{ transform: `rotate(${timeRef.current * 0.4}deg)`, transformOrigin: "center" }}
        >
          <div className="w-1/2 h-1/2 absolute top-0 left-0 origin-bottom-right bg-gradient-to-tl from-[#00f2ff]/20 to-transparent" />
        </div>

        {/* 3. Central Gorgeous Vector Neural Net Brain Overlay */}
        <div className="absolute inset-[11%] rounded-full bg-[#050505]/40 border border-zinc-900/40 flex items-center justify-center p-1 overflow-hidden backdrop-blur-2xs shadow-inner">
          <svg 
            className="w-full h-full text-cyan-400 select-none" 
            viewBox="0 0 100 100"
          >
            {/* Draw neural circuit lines (connections) */}
            <g className="opacity-40">
              {brainConnections.map(([fromIdx, toIdx], connIdx) => {
                const fromNode = brainNodes[fromIdx];
                const toNode = brainNodes[toIdx];
                const latencyPulse = (timeRef.current * 0.01 + connIdx * 0.1) % 1;
                
                return (
                  <g key={connIdx}>
                    {/* Basic Static wire path */}
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isProcessing ? "rgba(168, 85, 247, 0.55)" : "rgba(6, 182, 212, 0.45)"}
                      strokeWidth="0.85"
                    />
                    
                    {/* Dynamic pulse traveling along wires */}
                    <circle
                      cx={fromNode.x + (toNode.x - fromNode.x) * latencyPulse}
                      cy={fromNode.y + (toNode.y - fromNode.y) * latencyPulse}
                      r="1.1"
                      fill={isProcessing ? "#a855f7" : "#00f2ff"}
                      className="blur-3xs"
                    />
                  </g>
                );
              })}
            </g>

            {/* Draw neural synaptical hubs (Nodes) */}
            <g>
              {brainNodes.map((node, nodeIdx) => {
                // Determine hub blinking synapse
                const phase = (nodeIdx * 0.4) + (timeRef.current * 0.03);
                const isEmeraldHub = nodeIdx % 5 === 2; // mix some green emerald nodes exactly like cockpit telemetry
                const microScale = Math.sin(phase) * 0.45 + 1.1;
                
                return (
                  <g key={nodeIdx}>
                    {/* Glowing outer halo aura */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={2.4 * microScale}
                      fill={isProcessing ? "rgba(168,85,247,0.25)" : (isEmeraldHub ? "rgba(16,185,129,0.3)" : "rgba(6,242,255,0.25)")}
                      className="animate-pulse"
                    />
                    {/* Crisp Core Node point */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={1.2}
                      className="transition-colors duration-300"
                      fill={isProcessing ? "#c084fc" : (isEmeraldHub ? "#10b981" : "#22d3ee")}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Small scanning telemetry subtext in the outer margin of the orb HUD */}
        <div className="absolute bottom-[3%] text-[#444] font-mono text-[8px] uppercase tracking-wider select-none font-bold">
          {isProcessing ? "COGNITIVE_GRID: BUSY" : "LOCK_OK: V4.2"}
        </div>
      </div>
      
    </div>
  );
}
