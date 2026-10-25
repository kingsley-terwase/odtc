import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { AppText } from './AppText';
import { Icon, IconName } from './Icon';

type Props = {
  title?: string;
  icon?: IconName; // defaults to a back arrow
  onBack?: () => void;
  right?: ReactNode;
  step?: { index: number; total: number };
};

export function TopBar({ title, icon = 'arrow-back', onBack, right, step }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ paddingTop: insets.top + 6, backgroundColor: colors.white }}>
      <View style={styles.row}>
        <Pressable
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/dashboard')))}
          style={styles.btn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={icon === 'close' ? 'Close' : 'Go back'}
        >
          <Icon name={icon} size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {title ? (
            <AppText variant="subheading" align="center" numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
      {step ? (
        <View style={styles.steps} accessibilityLabel={`Step ${step.index} of ${step.total}`}>
          {Array.from({ length: step.total }).map((_, i) => (
            <View key={i} style={[styles.seg, { backgroundColor: i < step.index ? colors.blue : colors.skyDeep }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  btn: { width: 42, height: 42, borderRadius: radius.pill, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' },
  right: { minWidth: 42, alignItems: 'flex-end' },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 12 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
});
