import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'outline' | 'outlineLight' | 'soft';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  size?: 'md' | 'sm';
  full?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const palette: Record<Variant, { bg: string; fg: string; border: string; pressed: string }> = {
  primary: { bg: colors.orange, fg: colors.white, border: colors.orange, pressed: colors.orangeDeep },
  secondary: { bg: colors.blue, fg: colors.white, border: colors.blue, pressed: colors.blueDeep },
  outline: { bg: 'transparent', fg: colors.blue, border: colors.blue, pressed: colors.sky },
  outlineLight: { bg: 'transparent', fg: colors.white, border: 'rgba(255,255,255,0.7)', pressed: 'rgba(255,255,255,0.14)' },
  soft: { bg: colors.sky, fg: colors.blue, border: colors.sky, pressed: colors.skyDeep },
};

export function Button({ label, onPress, variant = 'primary', icon, size = 'md', full, disabled, style }: Props) {
  const p = palette[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: pressed ? p.pressed : p.bg, borderColor: p.border, opacity: disabled ? 0.5 : 1 },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={p.fg} /> : null}
        <AppText variant={size === 'sm' ? 'small' : 'subheading'} weight="extrabold" color={p.fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  md: { paddingVertical: 14, paddingHorizontal: 22, minHeight: 52 },
  sm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 38 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
