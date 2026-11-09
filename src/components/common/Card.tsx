import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<Props> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
}) => {
  const { colors, borderRadius, shadows } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: variant === 'flat' ? colors.surfaceVariant : colors.card,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor: colors.border,
    ...(variant === 'elevated' ? shadows.sm : {}),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};
