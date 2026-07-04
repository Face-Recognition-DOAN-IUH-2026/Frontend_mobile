import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

const SWEEP_DURATION = 2000;

export function useRadarAnimation(active: boolean) {
  const scanValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      scanValue.stopAnimation();
      scanValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanValue, {
          toValue: 1,
          duration: SWEEP_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanValue, {
          toValue: 0,
          duration: SWEEP_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [active, scanValue]);

  return scanValue;
}
