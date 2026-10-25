import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';

/** Pick-up and drop-off addresses joined by a dotted line. */
export function RouteLine({ from, to, small }: { from: string; to: string; small?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.rail}>
        <View style={styles.dotFrom} />
        <View style={styles.line} />
        <View style={styles.dotTo} />
      </View>
      <View style={{ flex: 1, justifyContent: 'space-between', gap: small ? 10 : 16 }}>
        <View>
          <AppText variant="caption" color={colors.slate}>
            Pick-up
          </AppText>
          <AppText variant={small ? 'small' : 'body'} weight="bold" numberOfLines={2}>
            {from}
          </AppText>
        </View>
        <View>
          <AppText variant="caption" color={colors.slate}>
            Drop-off
          </AppText>
          <AppText variant={small ? 'small' : 'body'} weight="bold" numberOfLines={2}>
            {to}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center', paddingVertical: 4 },
  dotFrom: { width: 14, height: 14, borderRadius: 7, borderWidth: 4, borderColor: colors.blue, backgroundColor: colors.white },
  line: { flex: 1, width: 2, backgroundColor: colors.skyDeep, marginVertical: 3 },
  dotTo: { width: 14, height: 14, borderRadius: 3, backgroundColor: colors.orange },
});
