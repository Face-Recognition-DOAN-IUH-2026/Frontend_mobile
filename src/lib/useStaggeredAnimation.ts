import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

interface StaggerConfig {
  itemDelay?: number;
  duration?: number;
  staggerCount?: number;
}

export function useStaggeredAnimation({
  itemDelay = 60,
  duration = 400,
  staggerCount = 0,
}: StaggerConfig = {}) {
  const opacitys = useRef<Animated.Value[]>([]).current;
  const offsets = useRef<Animated.Value[]>([]).current;

  const getAnimation = (index: number) => {
    while (opacitys.length <= index) {
      opacitys.push(new Animated.Value(0));
      offsets.push(new Animated.Value(12));
    }
    return {
      opacity: opacitys[index],
      transform: [{ translateY: offsets[index] }],
    };
  };

  useEffect(() => {
    if (staggerCount <= 0) return;

    while (opacitys.length < staggerCount) {
      opacitys.push(new Animated.Value(0));
      offsets.push(new Animated.Value(12));
    }

    const animations = Array.from({ length: staggerCount }, (_, i) =>
      Animated.parallel([
        Animated.timing(opacitys[i], {
          toValue: 1,
          duration,
          delay: i * itemDelay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(offsets[i], {
          toValue: 0,
          duration,
          delay: i * itemDelay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(itemDelay, animations).start();
  }, [staggerCount, itemDelay, duration]);

  return { getAnimation };
}
