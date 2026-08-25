import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  audioBase64: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBase64(null);

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission is required for recording');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise<void>(async (resolve) => {
      if (recordingRef.current && isRecording) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();

          if (uri) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              setAudioBase64(base64);
              setIsRecording(false);
              resolve();
            };
            reader.readAsDataURL(blob);
          } else {
            setIsRecording(false);
            resolve();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to stop recording');
          setIsRecording(false);
          resolve();
        }
      } else {
        setIsRecording(false);
        resolve();
      }
    });
  }, [isRecording]);

  return {
    isRecording,
    audioBase64,
    startRecording,
    stopRecording,
    error,
  };
}
