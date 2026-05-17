import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamingText?: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, isStreaming, streamingText }: Props) {
  const isUser = message.role === 'user';
  const displayContent =
    isStreaming && streamingText !== undefined ? streamingText : message.content;

  if (message.role === 'tool') {
    return (
      <View style={styles.toolRow}>
        <Text style={styles.toolText}>
          Инструмент: {message.toolName ?? 'неизвестно'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {isStreaming && !streamingText ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={Colors.textMuted} />
            <Text style={styles.typingText}>Печатает...</Text>
          </View>
        ) : (
          <Text style={[styles.content, isUser ? styles.contentUser : styles.contentAssistant]}>
            {displayContent}
          </Text>
        )}
        <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAssistant]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  contentUser: {
    color: Colors.text,
  },
  contentAssistant: {
    color: Colors.text,
  },
  time: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  timeUser: {
    color: Colors.textMuted,
    textAlign: 'right',
  },
  timeAssistant: {
    color: Colors.textMuted,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  toolRow: {
    alignSelf: 'center',
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
});
