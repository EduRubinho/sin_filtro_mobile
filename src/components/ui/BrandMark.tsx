import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <View style={styles.row}>
    <Text style={[styles.name, compact && styles.compact]}>SinFiltro</Text>
    <View style={styles.spark}>
      <View style={[styles.ray, styles.rayOne]} />
      <View style={[styles.ray, styles.rayTwo]} />
      <View style={[styles.ray, styles.rayThree]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  name: { color: colors.ink, fontSize: 46, lineHeight: 52, fontWeight: '900', letterSpacing: -2.6 },
  compact: { fontSize: 25, lineHeight: 30, letterSpacing: -1.3 },
  spark: { width: 25, height: 28, marginLeft: 3 },
  ray: { position: 'absolute', width: 12, height: 4, borderRadius: 3, backgroundColor: colors.coral },
  rayOne: { top: 2, left: 2, transform: [{ rotate: '-62deg' }] },
  rayTwo: { top: 12, left: 9, transform: [{ rotate: '-8deg' }] },
  rayThree: { top: 21, left: 3, transform: [{ rotate: '45deg' }] },
});
