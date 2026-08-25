import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { CompanionState, VisemeData } from '../../../types/ai';

interface CompanionAvatarProps {
  state: CompanionState;
  visemeData?: VisemeData[];
  size?: number;
}

const getStateColor = (state: CompanionState): string => {
  switch (state) {
    case 'idle':
      return '#6366f1';
    case 'listening':
      return '#3b82f6';
    case 'speaking':
      return '#10b981';
    case 'thinking':
      return '#f59e0b';
    case 'error':
      return '#ef4444';
    default:
      return '#6366f1';
  }
};

export default function CompanionAvatar({
  state,
  visemeData = [],
  size = 120,
}: CompanionAvatarProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const color = getStateColor(state);

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    switch (state) {
      case 'idle':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'listening':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'speaking':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.15,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'thinking':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      default:
        animation = Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        });
    }

    animation.start();

    return () => {
      animation.stop();
    };
  }, [state, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.innerCircle,
            {
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: (size * 0.6) / 2,
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.text,
              {
                fontSize: size * 0.25,
                color,
              },
            ]}
          >
            {state === 'thinking' ? '...' : state === 'error' ? '!' : 'AI'}
          </Animated.Text>
        </View>
      </Animated.View>

      {state === 'speaking' && visemeData.length > 0 && (
        <View style={styles.visemeContainer}>
          {visemeData.slice(0, 5).map((viseme, index) => (
            <View
              key={index}
              style={[
                styles.visemeBar,
                {
                  height: Math.max(4, viseme.value * 2),
                  backgroundColor: color,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: 'bold',
  },
  visemeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    marginTop: 8,
    gap: 2,
  },
  visemeBar: {
    width: 4,
    borderRadius: 2,
  },
});
