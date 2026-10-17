import { Pressable, StyleSheet, Text } from 'react-native';

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
      style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}
    >
      <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1E5547',
    borderRadius: 12,
    minHeight: 54,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1E5547', padding: 16, minHeight: 54 },
  secondaryText: { color: '#1E5547' },
});
