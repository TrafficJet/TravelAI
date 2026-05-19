import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Typography } from '../constants/typography';

export default function TermsOfServiceScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Добро пожаловать в SVIT. Используя наше приложение, вы соглашаетесь с настоящими
          Условиями использования. Пожалуйста, внимательно ознакомьтесь с ними перед использованием сервиса.
        </Text>

        <Text style={styles.sectionTitle}>1. Описание сервиса</Text>
        <Text style={styles.body}>
          SVIT — это AI-ассистент для путешественников, который помогает искать авиабилеты и отели,
          управлять бронированиями и получать персональные рекомендации. Сервис доступен через мобильное
          приложение на платформах iOS и Android.
        </Text>

        <Text style={styles.sectionTitle}>2. Регистрация и аккаунт</Text>
        <Text style={styles.bullet}>- Для полноценного использования сервиса необходима регистрация</Text>
        <Text style={styles.bullet}>- Вы обязуетесь предоставлять достоверную информацию при регистрации</Text>
        <Text style={styles.bullet}>- Вы несёте ответственность за сохранность данных вашего аккаунта</Text>
        <Text style={styles.bullet}>- Одному пользователю разрешён только один аккаунт</Text>
        <Text style={styles.bullet}>- Передача аккаунта третьим лицам запрещена</Text>

        <Text style={styles.sectionTitle}>3. Использование сервиса</Text>
        <Text style={styles.body}>
          Вы соглашаетесь использовать SVIT только в законных целях и не нарушать права других
          пользователей. Запрещается:
        </Text>
        <Text style={styles.bullet}>- Использовать сервис для автоматизированного сбора данных (парсинг)</Text>
        <Text style={styles.bullet}>- Пытаться получить несанкционированный доступ к системам SVIT</Text>
        <Text style={styles.bullet}>- Распространять вредоносное программное обеспечение</Text>
        <Text style={styles.bullet}>- Публиковать незаконный или оскорбительный контент</Text>

        <Text style={styles.sectionTitle}>4. Бронирования и оплата</Text>
        <Text style={styles.body}>
          SVIT выступает посредником при бронировании авиабилетов и отелей. При оформлении бронирования:
        </Text>
        <Text style={styles.bullet}>- Стоимость рассчитывается на основе актуальных данных партнёров</Text>
        <Text style={styles.bullet}>- Оплата производится через внутренний кошелёк SVIT</Text>
        <Text style={styles.bullet}>- Бронирование считается подтверждённым после получения уведомления</Text>
        <Text style={styles.bullet}>- Условия отмены и возврата зависят от политики авиакомпании или отеля</Text>
        <Text style={[styles.body, styles.emphasis]}>
          SVIT не несёт ответственности за изменения расписания, отмену рейсов или иные действия
          авиакомпаний и отелей.
        </Text>

        <Text style={styles.sectionTitle}>5. Подписка и тарифы</Text>
        <Text style={styles.body}>
          SVIT предлагает бесплатный и Premium-тарифы:
        </Text>
        <Text style={styles.bullet}>- Бесплатный: базовый поиск, ограниченное число запросов к AI</Text>
        <Text style={styles.bullet}>- Premium: неограниченный AI-ассистент, приоритетный поиск, эксклюзивные предложения</Text>
        <Text style={styles.bullet}>- Подписка возобновляется автоматически, если не отменена за 24 часа до окончания</Text>
        <Text style={styles.bullet}>- Отменить подписку можно в настройках App Store или Google Play</Text>

        <Text style={styles.sectionTitle}>6. Интеллектуальная собственность</Text>
        <Text style={styles.body}>
          Все материалы приложения SVIT (логотип, дизайн, тексты, программный код) защищены
          авторским правом и являются собственностью SVIT. Копирование или воспроизведение
          без письменного разрешения запрещено.
        </Text>

        <Text style={styles.sectionTitle}>7. Ограничение ответственности</Text>
        <Text style={styles.body}>
          Сервис предоставляется «как есть». SVIT не гарантирует бесперебойную работу приложения
          и не несёт ответственности за прямые или косвенные убытки, связанные с использованием сервиса,
          включая упущенную выгоду или потерю данных.
        </Text>

        <Text style={styles.sectionTitle}>8. Изменения условий</Text>
        <Text style={styles.body}>
          Мы вправе изменять настоящие Условия в любое время. Об изменениях мы уведомим вас через
          приложение или по email. Продолжение использования сервиса после публикации изменений
          означает ваше согласие с новой редакцией.
        </Text>

        <Text style={styles.sectionTitle}>9. Контакты</Text>
        <Text style={styles.body}>
          По вопросам, связанным с настоящими Условиями использования, обращайтесь:
        </Text>
        <Text style={styles.contact}>support@travelai.app</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>SVIT — ваш AI-ассистент для путешествий</Text>
          <Text style={styles.footerText}>Версия условий: 1.0.0 от 01.01.2026</Text>
        </View>
      </ScrollView>
    </>
  );
}

function getStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 48,
    },
    intro: {
      fontFamily: 'Inter',
      fontSize: Typography.sizes.base,
      color: colors.text,
      lineHeight: 24,
      marginBottom: 24,
    },
    sectionTitle: {
      fontFamily: 'Sora',
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.bold,
      color: colors.text,
      marginTop: 8,
      marginBottom: 10,
    },
    body: {
      fontFamily: 'Inter',
      fontSize: Typography.sizes.base,
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: 8,
    },
    bullet: {
      fontFamily: 'Inter',
      fontSize: Typography.sizes.base,
      color: colors.textMuted,
      lineHeight: 22,
      paddingLeft: 8,
      marginBottom: 4,
    },
    emphasis: {
      color: colors.text,
      marginTop: 8,
      fontWeight: Typography.weights.medium,
    },
    contact: {
      fontFamily: 'Inter',
      fontSize: Typography.sizes.base,
      color: colors.primary,
      fontWeight: Typography.weights.semibold,
      marginTop: 4,
      marginBottom: 8,
    },
    footer: {
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 4,
    },
    footerText: {
      fontFamily: 'Inter',
      fontSize: Typography.sizes.xs,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
