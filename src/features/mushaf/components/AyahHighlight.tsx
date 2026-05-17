import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Rect } from '../types/mushaf';

interface AyahHighlightProps {
  rect: Rect;
  type: 'selected' | 'playing' | 'none';
}

export const AyahHighlight: React.FC<AyahHighlightProps> = ({ rect, type }) => {
  if (type === 'none') return null;

  const backgroundColor = 
    type === 'playing' 
      ? 'rgba(34, 197, 94, 0.35)' // Green for playing
      : 'rgba(52, 152, 219, 0.35)'; // Blue for selected

  return (
    <View
      style={[
        styles.highlight,
        {
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          backgroundColor,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  highlight: {
    position: 'absolute',
    borderRadius: 2,
  },
});
