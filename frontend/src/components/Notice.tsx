import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function Notice({ text, tone = 'info' }: { text: string; tone?: 'info' | 'success' }) {
  const bg = tone === 'success' ? '#E5F6EC' : colors.sky;
  const fg = tone === 'success' ? colors.success : colors.blue;
  return (
    <View style={[styles.box, { backgroundColor: bg }]} accessibilityRole="alert">
      <Icon name={tone === 'success' ? 'checkmark-circle' : 'information-circle'} size={22} color={fg} />
      <AppText variant="small" weight="bold" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: radius.md, padding: 14, marginTop: 16 },
});
