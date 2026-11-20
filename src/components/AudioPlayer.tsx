import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Download, Volume2, Mic2, Radio, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface AudioPlayerProps {
  base64Audio: string | null;
  onEnded?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio, onEnded }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(0); // detune in cents
  const [bass, setBass] = useState(0); // gain in dB
  const [treble, setTreble] = useState(0); // gain in dB
  const [isRadioEffect, setIsRadioEffect] = useState(false);
  const [isEchoEffect, setIsEchoEffect] = useState(false);
  const [isRobotEffect, setIsRobotEffect] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bassNodeRef = useRef<BiquadFilterNode | null>(null);
  const trebleNodeRef = useRef<BiquadFilterNode | null>(null);
  const radioNodeRef = useRef<BiquadFilterNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const feedbackNodeRef = useRef<GainNode | null>(null);
  const robotOscRef = useRef<OscillatorNode | null>(null);
  const robotGainRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  useEffect(() => {
    if (base64Audio) {
      // Clear previous state when new audio arrives
      audioBufferRef.current = null;
      pausedAtRef.current = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      
      decodeAudio(base64Audio).catch(err => {
        console.error("Failed to decode audio on change:", err);
      });
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [base64Audio]);

  const decodeAudio = async (base64: string) => {
    try {
      const binaryString = atob(base64);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const uint8View = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        uint8View[i] = binaryString.charCodeAt(i);
      }

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      try {
        // Try decoding as standard format first (WAV/MP3/etc)
        const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        audioBufferRef.current = buffer;
      } catch (e) {
        // If that fails, it's likely raw 16-bit PCM at 24000Hz (standard Gemini TTS output)
        console.warn("Standard decode failed, attempting raw PCM parse...");
        
        const pcmData = new Int16Array(arrayBuffer);
        const float32Data = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          float32Data[i] = pcmData[i] / 32768.0;
        }

        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);
        audioBufferRef.current = buffer;
      }
      
      if (audioBufferRef.current) {
        setDuration(audioBufferRef.current.duration);
      }
    } catch (err) {
      console.error("Error decoding audio:", err);
      throw err;
    }
  };

  useEffect(() => {
    let interval: number;
    if (isPlaying && audioContextRef.current) {
      interval = window.setInterval(() => {
        if (audioContextRef.current) {
          const current = audioContextRef.current.currentTime - startTimeRef.current;
          setCurrentTime(Math.min(current, duration));
          if (current >= duration) {
            setIsPlaying(false);
            setCurrentTime(duration);
            clearInterval(interval);
          }
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const play = async () => {
    if (!base64Audio) return;
    
    // Ensure we have a valid context
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!audioBufferRef.current) {
      await decodeAudio(base64Audio);
    }

    if (!audioBufferRef.current) {
      console.error("Failed to decode audio buffer.");
      return;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const bassNode = ctx.createBiquadFilter();
    const trebleNode = ctx.createBiquadFilter();
    const radioNode = ctx.createBiquadFilter();
    const delayNode = ctx.createDelay();
    const feedbackNode = ctx.createGain();
    const robotGain = ctx.createGain();
    const robotOsc = ctx.createOscillator();
    
    source.buffer = audioBufferRef.current;
    source.detune.value = pitch;
    gainNode.gain.value = volume;

    bassNode.type = 'lowshelf';
    bassNode.frequency.value = 200;
    bassNode.gain.value = bass;

    trebleNode.type = 'highshelf';
    trebleNode.frequency.value = 3000;
    trebleNode.gain.value = treble;

    radioNode.type = 'bandpass';
    radioNode.frequency.value = 1500;
    radioNode.Q.value = 1.0;

    delayNode.delayTime.value = 0.3;
    feedbackNode.gain.value = 0.4;

    robotOsc.type = 'sawtooth';
    robotOsc.frequency.value = 50;
    robotGain.gain.value = 0; // Will be modulated

    // Chain: Source -> Bass -> Treble -> (Robot?) -> (Radio?) -> (Echo?) -> Gain -> Destination
    let lastNode: AudioNode = source;
    lastNode = lastNode.connect(bassNode);
    lastNode = lastNode.connect(trebleNode);
    
    if (isRobotEffect) {
      const ringMod = ctx.createGain();
      ringMod.gain.value = 0;
      robotOsc.connect(ringMod.gain);
      lastNode.connect(ringMod);
      lastNode = ringMod;
      robotOsc.start();
    }

    if (isRadioEffect) {
      lastNode = lastNode.connect(radioNode);
    }

    if (isEchoEffect) {
      const echoGain = ctx.createGain();
      echoGain.gain.value = 0.5;
      lastNode.connect(delayNode);
      delayNode.connect(feedbackNode);
      feedbackNode.connect(delayNode);
      delayNode.connect(echoGain);
      echoGain.connect(gainNode);
    }
    
    lastNode = lastNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      pausedAtRef.current = 0;
      setCurrentTime(0);
      if (onEnded) onEnded();
    };

    const offset = pausedAtRef.current;
    source.start(0, offset);
    
    sourceNodeRef.current = source;
    gainNodeRef.current = gainNode;
    bassNodeRef.current = bassNode;
    trebleNodeRef.current = trebleNode;
    radioNodeRef.current = radioNode;
    delayNodeRef.current = delayNode;
    feedbackNodeRef.current = feedbackNode;
    robotOscRef.current = robotOsc;
    robotGainRef.current = robotGain;
    
    startTimeRef.current = ctx.currentTime - offset;
    setIsPlaying(true);
  };

  const pause = () => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      }
    } catch (e) {
      // Ignore errors if already stopped or not started
    } finally {
      sourceNodeRef.current = null;
      gainNodeRef.current = null;
      bassNodeRef.current = null;
      trebleNodeRef.current = null;
      radioNodeRef.current = null;
      delayNodeRef.current = null;
      feedbackNodeRef.current = null;
      
      try {
        if (robotOscRef.current) {
          robotOscRef.current.stop();
        }
      } catch (e) {}
      robotOscRef.current = null;
      robotGainRef.current = null;
      
      if (audioContextRef.current) {
        const current = audioContextRef.current.currentTime - startTimeRef.current;
        pausedAtRef.current = Math.max(0, Math.min(current, duration));
      }
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(newVolume, audioContextRef.current.currentTime, 0.01);
    }
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = parseInt(e.target.value);
    setPitch(newPitch);
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.detune.setTargetAtTime(newPitch, audioContextRef.current.currentTime, 0.01);
    }
  };

  const handleBassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBass = parseFloat(e.target.value);
    setBass(newBass);
    if (bassNodeRef.current && audioContextRef.current) {
      bassNodeRef.current.gain.setTargetAtTime(newBass, audioContextRef.current.currentTime, 0.01);
    }
  };

  const handleTrebleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTreble = parseFloat(e.target.value);
    setTreble(newTreble);
    if (trebleNodeRef.current && audioContextRef.current) {
      trebleNodeRef.current.gain.setTargetAtTime(newTreble, audioContextRef.current.currentTime, 0.01);
    }
  };

  const toggleRadioEffect = () => {
    const newState = !isRadioEffect;
    setIsRadioEffect(newState);
    if (isPlaying && audioContextRef.current) {
      const currentOffset = audioContextRef.current.currentTime - startTimeRef.current;
      pause();
      pausedAtRef.current = currentOffset;
      play().catch(err => console.error("Radio effect playback failed:", err));
    }
  };

  const toggleEchoEffect = () => {
    const newState = !isEchoEffect;
    setIsEchoEffect(newState);
    if (isPlaying && audioContextRef.current) {
      const currentOffset = audioContextRef.current.currentTime - startTimeRef.current;
      pause();
      pausedAtRef.current = currentOffset;
      play().catch(err => console.error("Echo effect playback failed:", err));
    }
  };

  const toggleRobotEffect = () => {
    const newState = !isRobotEffect;
    setIsRobotEffect(newState);
    if (isPlaying && audioContextRef.current) {
      const currentOffset = audioContextRef.current.currentTime - startTimeRef.current;
      pause();
      pausedAtRef.current = currentOffset;
      play().catch(err => console.error("Robot effect playback failed:", err));
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play().catch(err => {
        console.error("Playback failed:", err);
        setIsPlaying(false);
      });
    }
  };

  const reset = () => {
    pause();
    pausedAtRef.current = 0;
    play().catch(err => console.error("Reset playback failed:", err));
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const download = () => {
    if (!base64Audio || !audioBufferRef.current) return;
    
    const buffer = audioBufferRef.current;
    const length = buffer.length * 2; // 16-bit PCM
    const wavBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(wavBuffer);
    
    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + length, true); // file length
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // fmt chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // length of fmt chunk
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, buffer.sampleRate, true); // sample rate
    view.setUint32(28, buffer.sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, length, true); // data length
    
    // Write PCM samples
    const data = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < data.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `masry-youtuber-${Date.now()}.wav`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!base64Audio) return null;

  return (
    <div className="flex flex-col gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 shrink-0 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors shadow-lg shadow-red-900/20"
        >
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
        </button>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-medium">
              <Volume2 size={14} />
              <span>Studio Output • {formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <button 
              onClick={() => setShowEffects(!showEffects)}
              className={cn(
                "p-1 rounded-md transition-colors",
                showEffects ? "bg-red-500/20 text-red-400" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative group/progress cursor-pointer">
            <div 
              className="h-full bg-red-500 transition-all duration-100 relative"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Restart"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={download}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Download Raw Audio"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 px-2 py-1 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
          <Volume2 size={16} className="text-zinc-500" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3 px-2 py-1 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
          <Mic2 size={16} className="text-zinc-500" />
          <input
            type="range"
            min="-1200"
            max="1200"
            step="10"
            value={pitch}
            onChange={handlePitchChange}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-[10px] font-mono text-zinc-500 w-12 text-right">
            {pitch > 0 ? '+' : ''}{pitch}c
          </span>
        </div>
      </div>

      {showEffects && (
        <div className="flex flex-col gap-4 pt-4 border-t border-zinc-800/50 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 px-2 py-1 bg-zinc-950/30 rounded-lg border border-zinc-800/30">
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">Bass Boost</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-10"
                  max="15"
                  step="1"
                  value={bass}
                  onChange={handleBassChange}
                  className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <span className="text-[9px] font-mono text-zinc-500 w-6">{bass}dB</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 px-2 py-1 bg-zinc-950/30 rounded-lg border border-zinc-800/30">
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">Treble</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-10"
                  max="15"
                  step="1"
                  value={treble}
                  onChange={handleTrebleChange}
                  className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <span className="text-[9px] font-mono text-zinc-500 w-6">{treble}dB</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleRadioEffect}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-tighter transition-all",
                isRadioEffect 
                  ? "bg-red-500/10 border-red-500/30 text-red-400" 
                  : "bg-zinc-950/30 border-zinc-800/30 text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Radio size={14} />
              Radio FX
            </button>

            <button
              onClick={toggleEchoEffect}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-tighter transition-all",
                isEchoEffect 
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                  : "bg-zinc-950/30 border-zinc-800/30 text-zinc-500 hover:text-zinc-300"
              )}
            >
              <RotateCcw size={14} className="rotate-45" />
              Echo (Delay)
            </button>

            <button
              onClick={toggleRobotEffect}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-tighter transition-all",
                isRobotEffect 
                  ? "bg-purple-500/10 border-purple-500/30 text-purple-400" 
                  : "bg-zinc-950/30 border-zinc-800/30 text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Mic2 size={14} />
              Robot Voice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
