import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Страница не найдена</Text>
      <Link href="/(tabs)" style={styles.link}>
        Вернуться на главную
      </Link>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 16,
    },
    link: {
      color: colors.primary,
      fontSize: 16,
    },
  });
}
