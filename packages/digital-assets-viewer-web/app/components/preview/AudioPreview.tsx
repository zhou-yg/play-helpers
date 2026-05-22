'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/app/components/ui/button';

interface AudioPreviewProps {
  filePath: string;
}

export function AudioPreview({ filePath }: AudioPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      cursorColor: '#f43f5e',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 1,
      height: 100,
      barGap: 2,
    });

    const fileUrl = `/api/file?path=${encodeURIComponent(filePath)}`;
    wavesurfer.load(fileUrl);

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [filePath]);

  const handlePlayPause = () => {
    wavesurferRef.current?.playPause();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div ref={containerRef} className="w-full" />
      <Button onClick={handlePlayPause} variant="outline">
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
    </div>
  );
}
