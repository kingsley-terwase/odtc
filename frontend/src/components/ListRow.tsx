import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

type Props = {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  tone?: 'default' | 'danger';
  divider?: boolean;
};

export function ListRow({ icon, title, subtitle, onPress, right, tone = 'default', divider }: Props) {
  const fg = tone === 'danger' ? colors.danger : colors.blue;
  const body = (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={[styles.icon, { backgroundColor: tone === 'danger' ? colors.redSoft : colors.sky }]}>
        <Icon name={icon} size={21} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subheading" color={tone === 'danger' ? colors.danger : colors.ink}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.slate}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color="#9AA7BE" /> : null)}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
