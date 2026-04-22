import React from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import { Image, ImageLoadEventData } from 'expo-image';

interface PageImageProps {
  uri: string | null;
  onLayout: (event: LayoutChangeEvent) => void;
}

export const PageImage: React.FC<PageImageProps> = ({ uri, onLayout }) => {


  return (
    <View style={styles.container} onLayout={onLayout}>
      {uri && (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    flex: 1,
  },
});
