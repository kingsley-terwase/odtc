import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { AppText } from './AppText';

type Props<T extends string> = { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void };

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.item, on && styles.itemOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <AppText variant="small" weight="extrabold" color={on ? colors.white : colors.slate}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: '#EEF1F6', borderRadius: radius.pill, padding: 4 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill },
  itemOn: { backgroundColor: colors.blue },
});
