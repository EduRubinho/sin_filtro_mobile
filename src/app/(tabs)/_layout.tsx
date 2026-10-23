import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';
import { colors } from '../../components/ui/theme';

const icons = { map: '◆', plans: '□', memories: '▧', profile: '○' } as const;

function TabIcon({ name, color, focused }: { name: keyof typeof icons; color: ColorValue; focused: boolean }) {
  return <Text style={[styles.icon, { color }, focused && styles.focusedIcon]}>{icons[name]}</Text>;
}

export default function UserTabsLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    lazy: true,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: colors.ink,
    tabBarInactiveTintColor: '#727A76',
    tabBarLabelStyle: styles.label,
    tabBarItemStyle: styles.item,
    tabBarStyle: styles.bar,
  }}>
    <Tabs.Screen name="map" options={{ title: 'Mapa', tabBarIcon: props => <TabIcon name="map" {...props} /> }} />
    <Tabs.Screen name="plans" options={{ title: 'Planes', tabBarIcon: props => <TabIcon name="plans" {...props} /> }} />
    <Tabs.Screen name="memories" options={{ title: 'Recuerdos', tabBarIcon: props => <TabIcon name="memories" {...props} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: props => <TabIcon name="profile" {...props} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#FFFEFB', borderTopColor: '#E7E3DB', borderTopWidth: 1, height: 84, paddingTop: 8 },
  item: { paddingVertical: 3 }, label: { fontSize: 11, fontWeight: '700', marginBottom: 5 },
  icon: { fontSize: 22, lineHeight: 24, fontWeight: '700' }, focusedIcon: { fontWeight: '900' },
});
