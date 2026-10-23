import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../ui/BrandMark';
import { colors } from '../ui/theme';

export function ComingSoonScreen({ section }: { section: 'plans' | 'memories' }) {
  const plans = section === 'plans';
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}><BrandMark compact /></View>
    <View style={styles.content}>
      <View style={styles.icon}><Text style={styles.iconText}>{plans ? '□' : '▧'}</Text></View>
      <Text accessibilityRole="header" style={styles.title}>{plans ? 'Planes' : 'Recuerdos'}</Text>
      <Text style={styles.badge}>EN DESARROLLO</Text>
      <Text style={styles.description}>{plans ? 'Aquí podrás consultar las actividades que organizas y aquellas a las que te uniste.' : 'Aquí podrás consultar actividades finalizadas y sus álbumes cercanos.'}</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: 24, paddingTop: 16 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softCoral, marginBottom: 24 }, iconText: { color: colors.coral, fontSize: 42, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 36, fontWeight: '900', letterSpacing: -1 }, badge: { color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 10 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 360, marginTop: 18 },
});
