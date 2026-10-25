import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';

export function Avatar({ name, size = 44 }: { name?: string; size?: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <View style={[styles.a, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText weight="black" color={colors.white} style={{ fontSize: size * 0.42, lineHeight: size * 0.52 }}>
        {initial}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ a: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' } });
