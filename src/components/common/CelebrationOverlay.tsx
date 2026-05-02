import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withDelay, 
  withSequence, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Text } from './ui/Text';
import { useCelebrationStore } from '@/src/hooks/useCelebrationStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PARTICLE_COUNT = 12;

const Particle = ({ delay }: { delay: number }) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(Math.random() * 0.4 + 0.3);
  const color = '#276359';

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 100 + 50;
    
    x.value = withDelay(delay, withTiming(Math.cos(angle) * distance, { duration: 1000 }));
    y.value = withDelay(delay, withTiming(Math.sin(angle) * distance, { duration: 1000 }));
    opacity.value = withDelay(delay + 400, withTiming(0, { duration: 600 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.particle, animatedStyle]} />;
};

export const CelebrationOverlay = () => {
  const { isVisible, message, type, hide } = useCelebrationStore();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    display: opacity.value === 0 && !isVisible ? 'none' : 'flex',
  }));

  useEffect(() => {
    if (isVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      opacity.value = withTiming(1, { duration: 400 });
      scale.value = withSequence(
        withTiming(1.05, { duration: 250 }),
        withTiming(1, { duration: 200 })
      );

      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400 }, () => {
          runOnJS(hide)();
        });
      }, 2200);

      return () => clearTimeout(timer);
    } else {
      scale.value = withTiming(0);
      opacity.value = withTiming(0);
    }
  }, [isVisible]);

  const particles = React.useMemo(() => {
    if (!isVisible) return null;
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
      <Particle key={i} delay={i * 30} />
    ));
  }, [isVisible]);

  return (
    <Animated.View 
      style={[styles.container, animatedContainerStyle]} 
      pointerEvents={isVisible ? "auto" : "none"}
    >
      <Animated.View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={type === 'badge' ? "ribbon-outline" : "checkmark-circle-outline"} 
            size={42} 
            color="#276359" 
          />
          {particles}
        </View>
        <Text className="text-xl text-slate-900 mt-4 text-center tracking-tight">
          {message}
        </Text>
        <Text className="text-slate-400 text-[10px] uppercase tracking-[2px] text-center mt-2">
          {type === 'badge' ? 'Achievement Unlocked' : 'Session Recorded'}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
  },
  card: {
    backgroundColor: 'white',
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderRadius: 32,
    alignItems: 'center',
    width: width * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});

