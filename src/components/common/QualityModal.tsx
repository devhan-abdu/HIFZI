import React from 'react';
import { View, Pressable, Modal, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/src/components/common/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';

const { width } = Dimensions.get('window');

interface QualityModalProps {
  visible: boolean;
  onSelect: (score: number) => void;
  onClose: () => void;
  title?: string;
}

export const QualityModal = ({ visible, onSelect, onClose, title = "Session Quality" }: QualityModalProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const primaryColor = isDark ? "#276359" : "#276359";
  const chevronColor = isDark ? "#94a3b8" : "#94a3b8";

  const options = [
    { 
      score: 5, 
      label: "Excellent", 
      icon: "ribbon", 
      subLabel: "No mistakes, perfect flow" 
    },
    { 
      score: 3, 
      label: "Good", 
      icon: "medal", 
      subLabel: "Minor stumbles, mostly fluent" 
    },
    { 
      score: 1, 
      label: "Needs Work", 
      icon: "refresh-circle", 
      subLabel: "Many mistakes or hesitations" 
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        
        <View 
          style={styles.modalContainer}
          className="bg-surface rounded-[40px] p-8 shadow-2xl border border-border dark:border-white/10"
        >
          <View className="items-center mb-8">
            <View className="w-16 h-1.5 bg-border rounded-full mb-6" />
            <Text className="text-2xl tracking-tight text-text text-center">{title}</Text>
            <Text className="text-muted text-[13px] text-center mt-2 px-6 leading-5">
              Honest feedback helps us track your progress accurately.
            </Text>
          </View>

          <View className="gap-3">
            {options.map((opt) => (
              <Pressable
                key={opt.score}
                onPress={() => onSelect(opt.score)}
                className="flex-row items-center p-4 rounded-2xl active:scale-[0.98] transition-all bg-surface-muted dark:bg-background/30 border border-border dark:border-white/5 active:bg-primary"
              >
                <View 
                  className="w-12 h-12 rounded-full items-center justify-center mr-4 bg-surface dark:bg-surface-muted border border-border dark:border-white/10 shadow-sm"
                >
                  <Ionicons name={opt.icon as any} size={22} color={primaryColor} />
                </View>
                
                <View className="flex-1">
                  <Text className="text-base text-text">
                    {opt.label}
                  </Text>
                  <Text className="text-muted text-[12px] leading-4 mt-0.5">
                    {opt.subLabel}
                  </Text>
                </View>

                <View className="w-8 h-8 rounded-full bg-surface dark:bg-surface-muted items-center justify-center border border-border dark:border-white/10">
                  <Ionicons name="chevron-forward" size={14} color={chevronColor} />
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable 
            onPress={onClose}
            className="mt-8 py-4 items-center rounded-2xl active:bg-background"
          >
            <Text className="text-muted uppercase tracking-widest text-[11px]">Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    width: width * 0.94,
    maxWidth: 500,
  }
});
