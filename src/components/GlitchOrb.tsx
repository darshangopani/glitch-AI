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
  const [audioData, setAudioData] = useState<number[]>(new Array(32).fill(0));
  const requestRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

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
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        const updateAudio = () => {
          if (!active) return;
          if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            let sum = 0;
            // Focus on voice frequencies (lower half)
            const length = Math.floor(dataArrayRef.current.length / 2);
            for (let i = 0; i < length; i++) {
              sum += dataArrayRef.current[i];
            }
            const average = sum / length;
            // Soft normalization curve, caps output roughly between 0-1.5
            const normalized = Math.min(1.5, Math.pow(average / 100, 1.2));
            setAudioLevel(normalized);

            // Extract 32 bins for radial frequency visualizer
            const bins: number[] = [];
            for (let i = 0; i < 32; i++) {
               // Sample lower ranges where voice mostly lives
               bins.push(dataArrayRef.current[i * 2] / 255); 
            }
            setAudioData(bins);
            if (onAudioData) onAudioData(bins);
          }
          requestRef.current = requestAnimationFrame(updateAudio);
        };

        updateAudio();
      } catch (err) {
        console.error("Microphone access denied:", err);
      }
    };

    const cleanup = () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(console.error);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setAudioLevel(0);
      setAudioData(new Array(32).fill(0));
    };

    if (isListening) {
      startAudio();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isListening]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Background glow */}
      <motion.div
        animate={
          isListening 
          ? { scale: 1 + audioLevel * 0.4, opacity: 0.3 + audioLevel * 0.3 }
          : { scale: [1, 1.05, 1], opacity: [0.2, 0.3, 0.2] }
        }
        transition={isListening ? { duration: 0.05, ease: "linear" } : { repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className={cn(
          "absolute inset-0 rounded-full blur-3xl",
          isProcessing ? "bg-[#a855f7]" : isListening ? "bg-[#00f2ff]" : "bg-[#00f2ff]/30"
        )}
      />

      {/* Main Orb */}
      <motion.div
        animate={{
          scale: isProcessing ? [1, 1.05, 1] : 1,
          rotate: isProcessing ? [0, 90, 180, 270, 360] : 0,
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        className={cn(
          "relative w-48 h-48 rounded-full border bg-[#00f2ff]/5 flex items-center justify-center overflow-hidden",
          isProcessing ? "border-[#a855f7] shadow-[#a855f7]/50" : "border-[#00f2ff]/50"
        )}
      >
        <motion.div 
           animate={
             isListening 
             ? { scale: 1 + audioLevel * 0.3, opacity: 0.8 + audioLevel * 0.2 } 
             : { scale: 1, opacity: 0.8 }
           }
           transition={{ duration: 0.05 }}
           className={cn(
             "w-32 h-32 rounded-full",
             isProcessing ? "bg-[#a855f7] shadow-[#a855f7]" : "bg-[#00f2ff]"
           )}
           style={{
             boxShadow: isProcessing 
                 ? `0 0 40px #a855f7` 
                 : `0 0 ${40 + audioLevel * 60}px #00f2ff`
           }}
        />
        
        {/* Animated Rings/Layers */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#00f2ff_0%,transparent_70%)]" />
        
        <motion.div
          animate={{
            y: ["0%", "100%", "0%"],
          }}
          transition={{ repeat: Infinity, duration: 0.2, ease: "linear" }}
          className="absolute inset-0 bg-[#00f2ff]/10 h-1 w-full"
        />

        <div className="z-10 absolute text-[#00f2ff] font-mono text-[10px] mix-blend-difference select-none pointer-events-none text-center font-bold tracking-widest">
          {isProcessing ? "PROCESSING..." : isListening ? "LISTENING..." : "STANDBY"}
        </div>

        {/* Radial Frequency Visualizer */}
        {isListening && (
           <div className="absolute inset-0 pointer-events-none">
             {audioData.map((val, i) => {
               const angle = (i / audioData.length) * 360;
               return (
                 <motion.div
                   key={i}
                   className="absolute left-1/2 top-1/2 origin-bottom bg-[#00f2ff] shadow-[0_0_10px_#00f2ff]"
                   style={{
                     width: "2px",
                     height: "30px", // base height plus frequency
                     marginTop: "-70px", // pushes it outward (relative to center)
                     marginLeft: "-1px",
                     rotate: `${angle}deg`,
                     transformOrigin: "bottom center",
                   }}
                   animate={{
                      scaleY: 1 + val * 2, // scale up height based on freq val
                      opacity: 0.3 + val * 0.7,
                   }}
                   transition={{ duration: 0.05 }}
                 />
               );
             })}
           </div>
        )}
      </motion.div>

      {/* Outer Pulse Rings */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={
             isListening
             ? {
                 opacity: (audioLevel * 0.5) / i,
                 scale: 1.2 + (audioLevel * 0.4) + (i * 0.2),
               }
             : {
                 opacity: 0,
                 scale: 0.8,
               }
          }
          transition={{
            duration: isListening ? 0.1 : 0.5,
            ease: "easeOut",
          }}
          className={cn(
             "absolute w-48 h-48 rounded-full border border-dashed",
             isProcessing ? "border-[#a855f7]/30" : "border-[#00f2ff]/30"
          )}
        />
      ))}
    </div>
  );
}
