import { useState, useRef, useCallback } from 'react';
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';

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
  const recorderRef = useRef<AudioRecorder | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBase64(null);

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Quyền microphone là bắt buộc để ghi âm');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu ghi âm');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (recorderRef.current && isRecording) {
      try {
        await recorderRef.current.stop();
        const uri = recorderRef.current.uri;

        if (uri) {
          const response = await fetch(uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            setAudioBase64(base64);
            setIsRecording(false);
          };
          reader.readAsDataURL(blob);
        } else {
          setIsRecording(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể dừng ghi âm');
        setIsRecording(false);
      }
    } else {
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    audioBase64,
    startRecording,
    stopRecording,
    error,
  };
}
