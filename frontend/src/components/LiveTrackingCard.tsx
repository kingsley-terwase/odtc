import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, radius } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

// The map is drawn in a 320 x 170 box and scaled to the card width.
const VB_W = 320;
const VB_H = 170;
const P0 = { x: 44, y: 128 };
const P1 = { x: 96, y: 36 };
const P2 = { x: 176, y: 156 };
const P3 = { x: 276, y: 44 };

function bezier(t: number) {
  const u = 1 - t;
  const x = u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x;
  const y = u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y;
  return { x, y };
}

type Props = {
  eta?: string;
  from?: string;
  to?: string;
  status?: string;
  compact?: boolean;
};

export function LiveTrackingCard({
  eta = '8 min',
  from = 'Wuse Market',
  to = 'Maitama',
  status = 'Your rider is on the way',
}: Props) {
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ride = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(300),
      ]),
    );
    const ping = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    ride.start();
    ping.start();
    return () => {
      ride.stop();
      ping.stop();
    };
  }, [progress, pulse]);

  const scale = width / VB_W;
  const height = scale * VB_H;

  const { xs, ys, inputs } = useMemo(() => {
    const n = 28;
    const inputs: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const pt = bezier(t);
      inputs.push(t);
      xs.push(pt.x * scale);
      ys.push(pt.y * scale);
    }
    return { xs, ys, inputs };
  }, [scale]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const riderSize = 30;
  const tx = progress.interpolate({ inputRange: inputs, outputRange: xs.map((x) => x - riderSize / 2) });
  const ty = progress.interpolate({ inputRange: inputs, outputRange: ys.map((y) => y - riderSize / 2) });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  const path = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`;

  return (
    <View style={styles.card} accessible accessibilityLabel={`Live tracking preview. ${status}. Arriving in ${eta}.`}>
      <View onLayout={onLayout} style={[styles.map, { height: height || 170 }]}>
        {width > 0 ? (
          <>
            <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
              <Rect x={0} y={0} width={VB_W} height={VB_H} fill={colors.sky} />
              <Rect x={118} y={78} width={52} height={34} rx={6} fill={colors.skyDeep} />
              <Rect x={196} y={96} width={48} height={40} rx={6} fill={colors.skyDeep} />
              <Rect x={22} y={18} width={46} height={30} rx={6} fill={colors.skyDeep} />
              <Rect x={226} y={10} width={52} height={22} rx={6} fill={colors.skyDeep} />
              <Path d="M 0 96 L 320 76" stroke={colors.white} strokeWidth={9} />
              <Path d="M 148 0 L 168 170" stroke={colors.white} strokeWidth={9} />
              <Path d="M 0 150 L 320 150" stroke={colors.white} strokeWidth={6} />
              <Path d={path} stroke={colors.blue} strokeWidth={4} strokeLinecap="round" strokeDasharray="1 9" fill="none" />
              <Circle cx={P0.x} cy={P0.y} r={7} fill={colors.white} stroke={colors.blue} strokeWidth={4} />
              <Circle cx={P3.x} cy={P3.y} r={9} fill={colors.orange} />
              <Circle cx={P3.x} cy={P3.y} r={3.5} fill={colors.white} />
            </Svg>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.rider,
                { width: riderSize, height: riderSize, borderRadius: riderSize / 2, transform: [{ translateX: tx }, { translateY: ty }] },
              ]}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius: riderSize / 2, backgroundColor: colors.orange, opacity: ringOpacity, transform: [{ scale: ringScale }] },
                ]}
              />
              <Icon name="bicycle" size={17} color={colors.white} />
            </Animated.View>
          </>
        ) : null}
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <AppText variant="caption" color={colors.ink}>
            Live
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">{status}</AppText>
          <AppText variant="small" color={colors.slate} numberOfLines={1}>
            {from} to {to}
          </AppText>
        </View>
        <View style={styles.eta}>
          <AppText variant="heading" color={colors.blue} style={{ lineHeight: 24 }}>
            {eta}
          </AppText>
          <AppText variant="caption" color={colors.slate}>
            arriving
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  map: { width: '100%', backgroundColor: colors.sky, overflow: 'hidden' },
  rider: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: colors.orange,
    borderWidth: 2.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  live: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  eta: { alignItems: 'flex-end' },
});
