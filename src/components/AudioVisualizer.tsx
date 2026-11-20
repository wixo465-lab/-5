import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  const bars = Array.from({ length: 20 });

  return (
    <div className="flex items-center justify-center gap-1 h-12 w-full max-w-md mx-auto">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-red-500 rounded-full"
          animate={{
            height: isPlaying 
              ? [10, Math.random() * 40 + 10, 10] 
              : 10
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};
