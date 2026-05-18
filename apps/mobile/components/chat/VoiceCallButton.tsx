import React from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

// ── VoiceCallButton ───────────────────────────────────────────────────────────
// Round 56 px button that reveals a "coming soon" Alert for AI voice calls.
// Render only for PREMIUM subscribers — check plan === 'PREMIUM' before use.

interface VoiceCallButtonProps {
  /** Optional override for button size (default: 56) */
  size?: number;
}

export function VoiceCallButton({ size = 56 }: VoiceCallButtonProps) {
  function handlePress() {
    Alert.alert(
      'AI Голосовой ассистент',
      'Наш AI сможет позвонить в ресторан или отель и договориться на нужном языке.\n\nФункция появится в следующем обновлении.',
      [
        {
          text: 'Подписаться на обновления',
          onPress: () => {
            Alert.alert(
              'Подписка оформлена',
              'Мы уведомим вас, когда голосовой ассистент станет доступен.',
            );
          },
        },
        { text: 'ОК', style: 'cancel' },
      ],
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="AI Голосовой ассистент"
      accessibilityRole="button"
    >
      <Ionicons name="call-outline" size={22} color={Colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
