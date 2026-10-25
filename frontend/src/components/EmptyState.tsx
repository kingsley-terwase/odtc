import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, IconName } from './Icon';

type Props = { icon: IconName; title: string; text: string; action?: { label: string; onPress: () => void } };

export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Icon name={icon} size={34} color={colors.blue} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      <AppText color={colors.slate} align="center" style={{ marginTop: 6, maxWidth: 300 }}>
        {text}
      </AppText>
      {action ? (
        <View style={{ marginTop: 20 }}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  icon: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
