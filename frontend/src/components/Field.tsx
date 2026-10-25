import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

type Props = TextInputProps & {
  label: string;
  error?: string;
  icon?: IconName;
};

export function Field({ label, error, icon, secureTextEntry, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  const border = error ? colors.danger : focused ? colors.blue : colors.line;

  return (
    <View style={styles.wrap}>
      <AppText variant="small" weight="bold" style={{ marginBottom: 6 }}>
        {label}
      </AppText>
      <View style={[styles.box, { borderColor: border, borderWidth: focused || error ? 2 : 1.5 }]}>
        {icon ? <Icon name={icon} size={19} color={focused ? colors.blue : colors.slate} /> : null}
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor="#8D9AB2"
          style={[styles.input, style]}
          accessibilityLabel={label}
        />
        {secureTextEntry ? (
          <Pressable
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.slate} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={{ marginTop: 6 }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, paddingVertical: 12 },
});
