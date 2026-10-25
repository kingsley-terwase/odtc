import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { StoredOrder } from '../state/OrdersContext';
import { colors, radius } from '../theme';
import { formatDate, naira, phaseInfo, phaseOf, shortRef, stageCount } from '../utils/format';
import { AppText } from './AppText';
import { RouteLine } from './RouteLine';
import { StatusChip } from './StatusChip';

export function OrderCard({ order }: { order: StoredOrder }) {
  const router = useRouter();
  const b = order.booking;
  const phase = phaseOf(b);
  const info = phaseInfo[phase];
  const done = stageCount(phase);
  const live = phase === 'awaiting' || phase === 'confirmed' || phase === 'picked';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Order ${shortRef(order.reference)}, ${info.label}`}
    >
      <View style={styles.top}>
        <AppText variant="small" weight="extrabold" color={colors.slate}>
          {shortRef(order.reference)}
        </AppText>
        <StatusChip label={info.label} tone={info.tone} />
      </View>
      <RouteLine small from={b.quote.pickup.address} to={b.quote.delivery.address} />
      {live ? (
        <View style={styles.bars}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.bar, { backgroundColor: i < done ? colors.blue : colors.skyDeep }]} />
          ))}
        </View>
      ) : null}
      <View style={styles.bottom}>
        <AppText variant="caption" color={colors.slate}>
          {formatDate(b.createdAt)}
        </AppText>
        <AppText variant="subheading">{naira(b.quote.totalFare)}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bars: { flexDirection: 'row', gap: 5 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});
