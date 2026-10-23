import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from './theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ title, onPress, disabled = false, variant = 'primary' }: ButtonProps) {
  const secondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    minHeight: 54,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  disabled: { opacity: 0.48 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink, padding: 16, minHeight: 54 },
  secondaryText: { color: colors.ink },
});
