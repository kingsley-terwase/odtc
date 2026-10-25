import { StyleSheet, View } from 'react-native';
import { Quote } from '../api';
import { colors } from '../theme';
import { naira } from '../utils/format';
import { AppText } from './AppText';

export function PriceBreakdown({ quote }: { quote: Quote }) {
  const rows: [string, string][] = [
    ['Delivery fare', naira(quote.deliveryFare)],
    ['Service charge', naira(quote.serviceCharge)],
    [`VAT (${Number(quote.vatRate)}%)`, naira(quote.vatAmount)],
  ];
  return (
    <View>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.row}>
          <AppText color={colors.slate}>{k}</AppText>
          <AppText weight="bold">{v}</AppText>
        </View>
      ))}
      <View style={[styles.row, styles.total]}>
        <AppText variant="subheading">Total</AppText>
        <AppText variant="heading" color={colors.blue}>
          {naira(quote.totalFare)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  total: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 6, paddingTop: 12 },
});
