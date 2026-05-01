import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withSequence, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Text } from './ui/Text';
import { useCelebrationStore } from '@/src/hooks/useCelebrationStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const PARTICLE_COUNT = 30;

const Particle = ({ delay }: { delay: number }) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(Math.random() * 0.5 + 0.5);
  
  const colors = ['#fbbf24', '#f59e0b', '#d97706', '#059669', '#10b981'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 200 + 100;
    
    x.value = withDelay(delay, withSpring(Math.cos(angle) * distance, { damping: 15 }));
    y.value = withDelay(delay, withSpring(Math.sin(angle) * distance, { damping: 15 }));
    opacity.value = withDelay(delay + 500, withTiming(0, { duration: 1000 }));
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
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withSpring(1, { damping: 12 })
      );

      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 }, () => {
          runOnJS(hide)();
        });
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      scale.value = withTiming(0);
      opacity.value = withTiming(0);
    }
  }, [isVisible]);

  // Memoize particles so they don't re-create during the animation render
  const particles = React.useMemo(() => {
    if (!isVisible) return null;
    return Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
      <Particle key={i} delay={i * 20} />
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
            name={type === 'badge' ? "trophy" : "checkmark-circle"} 
            size={60} 
            color="#fbbf24" 
          />
          {particles}
        </View>
        <Text className="text-3xl font-bold text-amber-900 mt-4 text-center">
          {message}
        </Text>
        <Text className="text-amber-700 font-medium text-center mt-1">
          {type === 'badge' ? 'New Achievement Unlocked!' : 'Progress Recorded!'}
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
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  card: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 40,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: '#fef3c7',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});
