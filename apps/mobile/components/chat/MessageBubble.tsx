import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Typography } from '../../constants/typography';
import { ChatToolResult } from './ToolResultCard';
import { useTheme } from '../../src/theme/ThemeContext';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamingText?: string;
  onLongPress?: (message: Message) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const stripEmoji = (text: string): string => {
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]/gu,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getToolLabel(toolName?: string): string {
  if (!toolName) return 'Обрабатываю...';
  const lower = toolName.toLowerCase();
  if (lower.includes('flight')) return 'Ищу рейсы...';
  if (lower.includes('hotel')) return 'Ищу отели...';
  if (lower.includes('transfer') || lower.includes('route')) return 'Рассчитываю маршрут...';
  return 'Обрабатываю...';
}

// ── Tool loading chip with blinking indicator ─────────────────────────────────

function ToolLoadingChip({ toolName }: { toolName?: string }) {
  const { colors } = useTheme();
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const dot0Opacity = useRef(new Animated.Value(1)).current;
  const dot1Opacity = useRef(new Animated.Value(0.75)).current;
  const dot2Opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    function makePulse(val: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 0.15,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(900 - delay),
        ]),
      );
    }

    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const p0 = makePulse(dot0Opacity, 0);
    const p1 = makePulse(dot1Opacity, 200);
    const p2 = makePulse(dot2Opacity, 400);

    blinkLoop.start();
    p0.start();
    p1.start();
    p2.start();

    return () => {
      blinkLoop.stop();
      p0.stop();
      p1.stop();
      p2.stop();
    };
  }, [blinkAnim, dot0Opacity, dot1Opacity, dot2Opacity]);

  return (
    <View style={toolChipStyles.row}>
      <Animated.View style={{ opacity: blinkAnim }}>
        <Ionicons name="search-outline" size={13} color={colors.textMuted} />
      </Animated.View>
      <Text style={[toolChipStyles.text, { color: colors.textMuted }]}>{getToolLabel(toolName)}</Text>
      <View style={toolChipStyles.dots}>
        {[dot0Opacity, dot1Opacity, dot2Opacity].map((dotOpacity, i) => (
          <Animated.View
            key={i}
            style={[toolChipStyles.dot, { backgroundColor: colors.primary, opacity: dotOpacity }]}
          />
        ))}
      </View>
    </View>
  );
}

const toolChipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontSize: Typography.sizes.xs,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    function pulse(dot: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ]),
      );
    }

    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 200);
    const a3 = pulse(dot3, 400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={typingStyles.row}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[typingStyles.dot, { backgroundColor: colors.textMuted, opacity: dot }]} />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// ── Markdown styles for AI bubble (dark SVIT theme) ───────────────────────────

const markdownStyles = StyleSheet.create({
  // react-native-markdown-display keys
  body: {
    color: '#E8E8F0',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  strong: {
    color: '#F59E0B',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  em: {
    color: '#E8E8F0',
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  bullet_list_item: {
    marginBottom: 6,
    flexDirection: 'row',
  },
  bullet_list_icon: {
    color: '#F59E0B',
    marginRight: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list_item: {
    marginBottom: 6,
    flexDirection: 'row',
  },
  ordered_list_icon: {
    color: '#F59E0B',
    marginRight: 6,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
    color: '#E8E8F0',
  },
  heading1: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
    fontFamily: 'Sora',
    lineHeight: 24,
  },
  heading2: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
    fontFamily: 'Sora',
    lineHeight: 22,
  },
  heading3: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  code_inline: {
    backgroundColor: '#2A2A42',
    color: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'Inter',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#2A2A42',
    color: '#E8E8F0',
    borderRadius: 6,
    padding: 10,
    fontFamily: 'Inter',
    fontSize: 13,
    marginBottom: 8,
  },
  fence: {
    backgroundColor: '#2A2A42',
    color: '#E8E8F0',
    borderRadius: 6,
    padding: 10,
    fontFamily: 'Inter',
    fontSize: 13,
    marginBottom: 8,
  },
  blockquote: {
    backgroundColor: '#2A2A42',
    borderLeftColor: '#F59E0B',
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 8,
  },
  hr: {
    backgroundColor: '#2A2A42',
    height: 1,
    marginVertical: 8,
  },
  text: {
    color: '#E8E8F0',
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 22,
  },
  softbreak: {
    width: '100%' as const,
  },
});

// ── Message content renderer ──────────────────────────────────────────────────

interface RichTextProps {
  content: string;
  isUser: boolean;
}

function RichText({ content, isUser }: RichTextProps) {
  if (isUser) {
    // User bubble is amber gradient — always use dark text for contrast
    return (
      <Text style={contentStyles.userText}>
        {content}
      </Text>
    );
  }

  // AI message — render through Markdown for full formatting support
  return (
    <Markdown style={markdownStyles}>
      {content}
    </Markdown>
  );
}

const contentStyles = StyleSheet.create({
  userText: {
    fontSize: Typography.sizes.base,
    lineHeight: 21,
    color: '#0A0A14',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});

// ── Fade + slide-up entrance animation ────────────────────────────────────────

function useEntranceAnim() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return { opacity, translateY };
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

export function MessageBubble({ message, isStreaming, streamingText, onLongPress }: Props) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';
  const rawContent =
    isStreaming && streamingText !== undefined ? streamingText : message.content;
  // For user bubbles keep as-is; for AI — show full content including emoji
  const displayContent = rawContent;

  const { opacity, translateY } = useEntranceAnim();

  // ── Tool message ─────────────────────────────────────────────────────────
  if (message.role === 'tool') {
    // If the message carries a tool result with actual data — render rich cards
    if (message.toolResult !== undefined && message.toolName) {
      return (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          <ChatToolResult
            toolName={message.toolName}
            result={message.toolResult}
          />
        </Animated.View>
      );
    }
    // Otherwise show the animated loading chip
    return (
      <Animated.View style={[
        styles.toolRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity,
        },
        { transform: [{ translateY }] },
      ]}>
        <ToolLoadingChip toolName={message.toolName} />
      </Animated.View>
    );
  }

  // ── Assistant row ────────────────────────────────────────────────────────
  if (!isUser) {
    return (
      <Animated.View
        style={[styles.row, styles.rowAssistant, { opacity, transform: [{ translateY }] }]}
      >
        {/* Avatar: gradient circle teal→amber with "S" letter */}
        <View style={styles.avatarGradientWrap}>
          <View style={styles.avatarGradientInner}>
            <Text style={styles.avatarLetter}>S</Text>
          </View>
        </View>

        <TouchableOpacity
          onLongPress={() => onLongPress?.(message)}
          activeOpacity={1}
          delayLongPress={350}
          style={styles.bubbleWrapper}
        >
          {/* AI bubble: bg #1C1C2E, border #2A2A42, radius 4px 16px 16px 16px */}
          <View style={styles.bubbleAssistant}>
            {isStreaming && !streamingText ? (
              <TypingIndicator />
            ) : (
              <RichText content={displayContent} isUser={false} />
            )}
            <Text style={[styles.timeAssistant, { color: colors.textMuted }]}>{formatTime(message.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── User row ─────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[styles.row, styles.rowUser, { opacity, transform: [{ translateY }] }]}
    >
      <TouchableOpacity
        onLongPress={() => onLongPress?.(message)}
        activeOpacity={1}
        delayLongPress={350}
        style={styles.bubbleWrapper}
      >
        {/* User bubble: gradient amber #F59E0B → #E8890A */}
        <LinearGradient
          colors={['#F59E0B', '#E8890A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bubbleUser}
        >
          <RichText content={displayContent} isUser={true} />
          <Text style={styles.timeUser}>{formatTime(message.createdAt)}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 5,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },

  // Avatar: gradient teal→amber circle with "S"
  avatarGradientWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#14B8A6', // fallback; gradient simulated via layered bg
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
    flexShrink: 0,
    // We use a simple split background trick: top half teal, bottom half amber
    overflow: 'hidden',
  },
  avatarGradientInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    // gradient approach: top border in teal via shadow
  },
  avatarLetter: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0A0A14',
    lineHeight: 11,
  },

  // Bubbles — wrapper limits width so TouchableOpacity doesn't stretch full row
  bubbleWrapper: {
    maxWidth: '90%',
    flexShrink: 1,
  },

  // User bubble: gradient amber #F59E0B → #E8890A, radius 16 16 4 16
  bubbleUser: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  // AI bubble: bg #1C1C2E, border 1px #2A2A42, radius 4 16 16 16
  bubbleAssistant: {
    backgroundColor: '#1C1C2E',
    borderWidth: 1,
    borderColor: '#2A2A42',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },

  // Timestamps
  timeUser: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'right',
    marginTop: 4,
    color: 'rgba(10,10,20,0.55)',
  },
  timeAssistant: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'left',
    marginTop: 4,
  },

  // Tool chip
  toolRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
});
