import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { AppText } from './AppText';

export type Tone = 'blue' | 'orange' | 'green' | 'red' | 'grey';

const tones: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: colors.sky, fg: colors.blue },
  orange: { bg: colors.orangeSoft, fg: colors.orangeDeep },
  green: { bg: colors.greenSoft, fg: colors.green },
  red: { bg: colors.redSoft, fg: colors.danger },
  grey: { bg: '#EEF1F6', fg: colors.slate },
};

export const toneColors = tones;

export function StatusChip({ label, tone = 'blue' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <View style={[styles.dot, { backgroundColor: t.fg }]} />
      <AppText variant="caption" color={t.fg} weight="extrabold">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
