import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<Props> = ({
  label,
  error,
  prefix,
  containerStyle,
  style,
  ...props
}) => {
  const { colors, borderRadius } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: error ? colors.expense : colors.border,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        {prefix && (
          <Text style={[styles.prefix, { color: colors.textSecondary }]}>
            {prefix}
          </Text>
        )}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            { color: colors.text },
            style,
          ]}
          {...props}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.expense }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: {
    fontSize: 11,
    marginTop: 4,
  },
});
