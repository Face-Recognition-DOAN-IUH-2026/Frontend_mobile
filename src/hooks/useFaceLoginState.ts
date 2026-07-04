import { useCallback, useRef, useState } from 'react';

const MAX_FACE_ATTEMPTS = 3;

export interface FaceLoginState {
  faceAttemptCount: number;
  faceFailed: boolean;
  showPasswordForm: boolean;
  attemptFaceLogin: (photoUri?: string) => Promise<boolean>;
  switchToPassword: () => void;
  resetFace: () => void;
}

export function useFaceLoginState(faceLoginFn: (uri: string) => Promise<void>): FaceLoginState {
  const [faceAttemptCount, setFaceAttemptCount] = useState(0);
  const [faceFailed, setFaceFailed] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const failCountRef = useRef(0);

  const attemptFaceLogin = useCallback(
    async (photoUri?: string): Promise<boolean> => {
      if (!photoUri) return false;

      try {
        await faceLoginFn(photoUri);
        failCountRef.current = 0;
        setFaceAttemptCount(0);
        return true;
      } catch {
        failCountRef.current += 1;
        const newCount = failCountRef.current;
        setFaceAttemptCount(newCount);

        if (newCount >= MAX_FACE_ATTEMPTS) {
          setFaceFailed(true);
          setShowPasswordForm(true);
        }
        return false;
      }
    },
    [faceLoginFn],
  );

  const switchToPassword = useCallback(() => {
    setShowPasswordForm(true);
  }, []);

  const resetFace = useCallback(() => {
    failCountRef.current = 0;
    setFaceAttemptCount(0);
    setFaceFailed(false);
    setShowPasswordForm(false);
  }, []);

  return {
    faceAttemptCount,
    faceFailed,
    showPasswordForm,
    attemptFaceLogin,
    switchToPassword,
    resetFace,
  };
}
