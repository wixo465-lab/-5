import React, { useState, useRef, useEffect } from 'react';
import { Music, Volume2, VolumeX, Play, Pause, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const TRACKS = [
  { id: 'none', name: 'No Music', url: '' },
  { id: 'lofi', name: 'Lo-fi Chill', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'vlog', name: 'Upbeat Vlog', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { id: 'tech', name: 'Tech Review', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'news', name: 'Dramatic News', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export const BackgroundMusic: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [currentTrackId, setCurrentTrackId] = useState('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const track = TRACKS.find(t => t.id === currentTrackId);
    if (audioRef.current) {
      // Stop anything currently playing or pending
      audioRef.current.pause();
      audioRef.current.src = '';
      
      if (track && track.url) {
        audioRef.current.src = track.url;
        audioRef.current.load();
        
        if (isPlaying) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromiseRef.current = playPromise;
            playPromise.catch(e => {
              if (e.name !== 'AbortError') {
                console.error("Playback failed", e);
              }
            });
          }
        }
      }
    }
  }, [currentTrackId]);

  const togglePlay = async () => {
    if (!audioRef.current || currentTrackId === 'none') return;
    
    if (isPlaying) {
      // If there's a pending play promise, wait for it before pausing
      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch (e) {
          // Ignore abort errors
        }
      }
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromiseRef.current = playPromise;
        try {
          await playPromise;
          setIsPlaying(true);
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error("Playback failed", e);
          }
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
          <Music size={16} className="text-purple-400" />
          Studio Ambience
        </div>
        {currentTrackId !== 'none' && (
          <button
            onClick={togglePlay}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all",
              isPlaying ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            )}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative group">
          <select
            value={currentTrackId}
            onChange={(e) => {
              setCurrentTrackId(e.target.value);
              if (e.target.value !== 'none') setIsPlaying(true);
            }}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 appearance-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 cursor-pointer"
          >
            {TRACKS.map(track => (
              <option key={track.id} value={track.id} className="bg-zinc-900">
                {track.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none group-hover:text-zinc-400 transition-colors" />
        </div>

        {currentTrackId !== 'none' && (
          <div className="flex items-center gap-3 px-2 py-1.5 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
            {volume === 0 ? <VolumeX size={14} className="text-zinc-600" /> : <Volume2 size={14} className="text-zinc-500" />}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] font-mono text-zinc-600 w-6 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
};
