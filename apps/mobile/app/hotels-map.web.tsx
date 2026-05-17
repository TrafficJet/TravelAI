import { View, Text, StyleSheet } from 'react-native';

export default function HotelsMapWeb() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Карта доступна в мобильном приложении</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, opacity: 0.6 },
});
