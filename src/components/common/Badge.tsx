import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  label: string;
  color?: string;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<Props> = ({
  label,
  color,
  backgroundColor,
  style,
}) => {
  const { colors, borderRadius } = useTheme();

  const textColor = color || colors.primary;
  const bgColor = backgroundColor || colors.primaryLight;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderRadius: borderRadius.full,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
