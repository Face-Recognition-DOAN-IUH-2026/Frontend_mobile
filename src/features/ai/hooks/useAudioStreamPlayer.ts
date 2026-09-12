import { useState, useRef, useCallback } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

interface UseAudioStreamPlayerReturn {
  isPlaying: boolean;
  play: (audioBase64: string) => Promise<void>;
  stop: () => Promise<void>;
  error: string | null;
}

export function useAudioStreamPlayer(): UseAudioStreamPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const stop = useCallback(async () => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch {}
      playerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(async (audioBase64: string) => {
    try {
      setError(null);
      await stop();

      const player = createAudioPlayer({
        uri: `data:audio/wav;base64,${audioBase64}`,
      });

      playerRef.current = player;

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          playerRef.current = null;
        }
      });

      player.play();
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể phát âm thanh');
      setIsPlaying(false);
    }
  }, [stop]);

  return {
    isPlaying,
    play,
    stop,
    error,
  };
}
