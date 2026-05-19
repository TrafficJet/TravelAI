import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

// ── Rich text renderer (bold, lists, headings, price highlighting) ────────────

const PRICE_PATTERN = /([€$]?\d[\d\s]*[€$]?(?:\.\d+)?(?:\s*[€$€])?)/g;

interface Segment {
  text: string;
  isPrice: boolean;
}

function splitPrices(raw: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  PRICE_PATTERN.lastIndex = 0;

  // Only highlight if the match looks like a real price (has a currency symbol)
  const REAL_PRICE = /[€$€]/;

  while ((match = PRICE_PATTERN.exec(raw)) !== null) {
    if (!REAL_PRICE.test(match[0])) continue;
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), isPrice: false });
    }
    segments.push({ text: match[0], isPrice: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), isPrice: false });
  }
  return segments;
}

interface RichLineProps {
  text: string;
  baseStyle: object;
  priceColor: string;
}

function RichLine({ text, baseStyle, priceColor }: RichLineProps) {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          const priceSegs = splitPrices(inner);
          return (
            <Text key={i} style={richStyles.bold}>
              {priceSegs.map((seg, j) =>
                seg.isPrice ? (
                  <Text key={j} style={[richStyles.price, { color: priceColor }]}>{seg.text}</Text>
                ) : (
                  <Text key={j}>{seg.text}</Text>
                ),
              )}
            </Text>
          );
        }
        const priceSegs = splitPrices(part);
        return priceSegs.map((seg, j) =>
          seg.isPrice ? (
            <Text key={`${i}-${j}`} style={[richStyles.price, { color: priceColor }]}>{seg.text}</Text>
          ) : (
            <Text key={`${i}-${j}`}>{seg.text}</Text>
          ),
        );
      })}
    </Text>
  );
}

const richStyles = StyleSheet.create({
  bold: {
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  price: {
    fontFamily: 'Inter',
    fontWeight: '600',
  },
});

interface RichTextProps {
  content: string;
  isUser: boolean;
}

function RichText({ content, isUser }: RichTextProps) {
  const { colors } = useTheme();

  if (isUser) {
    // For user messages just render plain text — no markdown.
    // Always use dark text (textInverse) on the amber bubble for sufficient contrast.
    return (
      <Text style={[contentStyles.base, { color: colors.textInverse, fontFamily: 'Inter', lineHeight: 22 }]}>
        {content}
      </Text>
    );
  }

  const lines = content.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        const key = index;

        // Heading # (H1)
        if (/^# /.test(line) && !line.startsWith('## ')) {
          const text = line.replace(/^#\s+/, '');
          return (
            <RichLine
              key={key}
              text={text}
              baseStyle={[contentStyles.headingH1, { color: colors.text }]}
              priceColor={colors.primary}
            />
          );
        }

        // Heading ## or ###
        if (line.startsWith('## ') || line.startsWith('### ')) {
          const text = line.replace(/^#{2,3}\s+/, '');
          return (
            <RichLine
              key={key}
              text={text}
              baseStyle={[contentStyles.heading, { color: colors.text }]}
              priceColor={colors.primary}
            />
          );
        }

        // Bullet list
        if (/^[-*•]\s/.test(line)) {
          const text = line.replace(/^[-*•]\s+/, '');
          return (
            <View key={key} style={contentStyles.listRow}>
              <Text style={[contentStyles.bullet, { color: colors.primary }]}>•</Text>
              <RichLine
                text={text}
                baseStyle={[contentStyles.listItem, { color: colors.text }]}
                priceColor={colors.primary}
              />
            </View>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <View key={key} style={contentStyles.listRow}>
                <Text style={[contentStyles.bullet, { color: colors.primary }]}>{numMatch[1]}.</Text>
                <RichLine
                  text={numMatch[2]}
                  baseStyle={[contentStyles.listItem, { color: colors.text }]}
                  priceColor={colors.primary}
                />
              </View>
            );
          }
        }

        // Empty line — add spacing
        if (line.trim() === '') {
          return <View key={key} style={contentStyles.spacer} />;
        }

        // Regular paragraph
        return (
          <RichLine
            key={key}
            text={line}
            baseStyle={[contentStyles.paragraph, { color: colors.text }]}
            priceColor={colors.primary}
          />
        );
      })}
    </View>
  );
}

const contentStyles = StyleSheet.create({
  base: {
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  headingH1: {
    fontFamily: 'Sora',
    fontSize: (Typography.sizes['2xl'] as number | undefined) ?? 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 6,
    marginTop: 8,
  },
  heading: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 4,
    marginTop: 6,
  },
  paragraph: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
  },
  bullet: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    width: 18,
    flexShrink: 0,
  },
  listItem: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    flex: 1,
  },
  spacer: {
    height: 6,
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
  const displayContent =
    isStreaming && streamingText !== undefined ? streamingText : message.content;

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

  // ── Assistant row (with plane icon) ──────────────────────────────────────
  if (!isUser) {
    return (
      <Animated.View
        style={[styles.row, styles.rowAssistant, { opacity, transform: [{ translateY }] }]}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="airplane" size={16} color={colors.primary} />
        </View>

        <TouchableOpacity
          onLongPress={() => onLongPress?.(message)}
          activeOpacity={1}
          delayLongPress={350}
          style={styles.bubbleWrapper}
        >
          <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
        <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: colors.primary }]}>
          <RichText content={displayContent} isUser={true} />
          <Text style={[styles.timeUser, { color: `${colors.textInverse}88` }]}>{formatTime(message.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },

  // Avatar
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
    flexShrink: 0,
  },

  // Bubbles — wrapper limits width so TouchableOpacity doesn't stretch full row
  bubbleWrapper: {
    maxWidth: '88%',
    flexShrink: 1,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  // Timestamps
  timeUser: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    textAlign: 'right',
    marginTop: 4,
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
