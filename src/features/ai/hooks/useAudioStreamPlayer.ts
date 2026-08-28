import { useState, useRef, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface UseAudioStreamPlayerReturn {
  isPlaying: boolean;
  play: (audioBase64: string) => Promise<void>;
  stop: () => Promise<void>;
  error: string | null;
}

export function useAudioStreamPlayer(): UseAudioStreamPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const play = useCallback(async (audioBase64: string) => {
    try {
      setError(null);
      await stop();

      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${audioBase64}` },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          soundRef.current = null;
        }
      });

      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    play,
    stop,
    error,
  };
}
