import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { ChatToolResult } from './ToolResultCard';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamingText?: string;
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
      <Animated.Text style={[toolChipStyles.icon, { opacity: blinkAnim }]}>🔍</Animated.Text>
      <Text style={toolChipStyles.text}>{getToolLabel(toolName)}</Text>
      <View style={toolChipStyles.dots}>
        {[dot0Opacity, dot1Opacity, dot2Opacity].map((dotOpacity, i) => (
          <Animated.View
            key={i}
            style={[toolChipStyles.dot, { opacity: dotOpacity }]}
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
  icon: {
    fontSize: 13,
  },
  text: {
    color: Colors.textMuted,
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
    backgroundColor: Colors.primary,
  },
});

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
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
        <Animated.View key={i} style={[typingStyles.dot, { opacity: dot }]} />
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
    backgroundColor: Colors.textMuted,
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
}

function RichLine({ text, baseStyle }: RichLineProps) {
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
                  <Text key={j} style={richStyles.price}>{seg.text}</Text>
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
            <Text key={`${i}-${j}`} style={richStyles.price}>{seg.text}</Text>
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
    color: Colors.text,
  },
  price: {
    color: Colors.primary,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
});

interface RichTextProps {
  content: string;
  isUser: boolean;
}

function RichText({ content, isUser }: RichTextProps) {
  if (isUser) {
    // For user messages just render plain text — no markdown
    return (
      <Text style={[contentStyles.base, contentStyles.user]}>{content}</Text>
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
              baseStyle={contentStyles.headingH1}
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
              baseStyle={contentStyles.heading}
            />
          );
        }

        // Bullet list
        if (/^[-*•]\s/.test(line)) {
          const text = line.replace(/^[-*•]\s+/, '');
          return (
            <View key={key} style={contentStyles.listRow}>
              <Text style={contentStyles.bullet}>•</Text>
              <RichLine text={text} baseStyle={contentStyles.listItem} />
            </View>
          );
        }

        // Numbered list
        if (/^\d+\.\s/.test(line)) {
          const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <View key={key} style={contentStyles.listRow}>
                <Text style={contentStyles.bullet}>{numMatch[1]}.</Text>
                <RichLine text={numMatch[2]} baseStyle={contentStyles.listItem} />
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
            baseStyle={contentStyles.paragraph}
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
  user: {
    color: Colors.textInverse,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  headingH1: {
    color: Colors.text,
    fontFamily: 'Sora',
    fontSize: (Typography.sizes['2xl'] as number | undefined) ?? 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 6,
    marginTop: 8,
  },
  heading: {
    color: Colors.text,
    fontFamily: 'Sora',
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 4,
    marginTop: 6,
  },
  paragraph: {
    color: Colors.text,
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
    color: Colors.primary,
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    lineHeight: 22,
    width: 18,
    flexShrink: 0,
  },
  listItem: {
    color: Colors.text,
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

export function MessageBubble({ message, isStreaming, streamingText }: Props) {
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
      <Animated.View style={[styles.toolRow, { opacity, transform: [{ translateY }] }]}>
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
        <View style={styles.avatar}>
          <Text style={styles.avatarIcon}>✈️</Text>
        </View>

        <View style={[styles.bubble, styles.bubbleAssistant]}>
          {isStreaming && !streamingText ? (
            <TypingIndicator />
          ) : (
            <RichText content={displayContent} isUser={false} />
          )}
          <Text style={styles.timeAssistant}>{formatTime(message.createdAt)}</Text>
        </View>
      </Animated.View>
    );
  }

  // ── User row ─────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[styles.row, styles.rowUser, { opacity, transform: [{ translateY }] }]}
    >
      <View style={[styles.bubble, styles.bubbleUser]}>
        <RichText content={displayContent} isUser={true} />
        <Text style={styles.timeUser}>{formatTime(message.createdAt)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 5,
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
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
    flexShrink: 0,
  },
  avatarIcon: {
    fontSize: 15,
  },

  // Bubbles
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Timestamps
  timeUser: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    color: `${Colors.textInverse}88`,
    textAlign: 'right',
    marginTop: 4,
  },
  timeAssistant: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
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
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolIcon: {
    fontSize: 13,
  },
  toolText: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
  },
});
