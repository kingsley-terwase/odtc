import { Text, TextProps, TextStyle } from 'react-native';
import { colors, fonts, type, TypeVariant } from '../theme';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: keyof typeof fonts;
};

export function AppText({ variant = 'body', color = colors.ink, align, weight, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        { color, textAlign: align },
        weight ? { fontFamily: fonts[weight] } : null,
        style,
      ]}
    />
  );
}
