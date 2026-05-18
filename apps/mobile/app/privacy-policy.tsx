import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Политика конфиденциальности</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Дата вступления в силу: 1 января 2026 г.</Text>

        <Text style={styles.intro}>
          TravelAI («мы», «нас» или «наш») серьёзно относится к конфиденциальности ваших данных.
          Настоящая Политика описывает, какую информацию мы собираем, как её используем и какие
          права у вас есть в отношении ваших данных.
        </Text>

        <Text style={styles.sectionTitle}>1. Какую информацию мы собираем</Text>
        <Text style={styles.body}>
          При использовании приложения TravelAI мы можем собирать следующие данные:
        </Text>
        <Text style={styles.bullet}>- Имя и адрес электронной почты (при регистрации)</Text>
        <Text style={styles.bullet}>- История поиска рейсов и отелей</Text>
        <Text style={styles.bullet}>- Данные о бронированиях (маршруты, даты, стоимость)</Text>
        <Text style={styles.bullet}>- Данные паспорта и личные данные путешественника (по вашему желанию)</Text>
        <Text style={styles.bullet}>- Информация об устройстве (модель, версия ОС, идентификатор устройства)</Text>
        <Text style={styles.bullet}>- Данные о геолокации (только при явном разрешении)</Text>

        <Text style={styles.sectionTitle}>2. Как мы используем ваши данные</Text>
        <Text style={styles.body}>
          Собранные данные используются исключительно для предоставления сервиса TravelAI:
        </Text>
        <Text style={styles.bullet}>- Для обработки поиска рейсов и отелей</Text>
        <Text style={styles.bullet}>- Для управления бронированиями и отображения их истории</Text>
        <Text style={styles.bullet}>- Для персонализации рекомендаций AI-ассистента</Text>
        <Text style={styles.bullet}>- Для отправки уведомлений о статусе бронирований и изменении цен</Text>
        <Text style={styles.bullet}>- Для улучшения качества работы приложения</Text>
        <Text style={[styles.body, styles.emphasis]}>
          Мы не продаём и не передаём ваши персональные данные третьим лицам в коммерческих целях.
        </Text>

        <Text style={styles.sectionTitle}>3. Push-уведомления</Text>
        <Text style={styles.body}>
          Приложение может отправлять push-уведомления о:
        </Text>
        <Text style={styles.bullet}>- Статусе и изменениях по вашим бронированиям</Text>
        <Text style={styles.bullet}>- Снижении цен на отслеживаемые рейсы и отели</Text>
        <Text style={styles.bullet}>- Системных обновлениях сервиса</Text>
        <Text style={styles.body}>
          Вы можете управлять разрешениями на уведомления в настройках приложения или в системных
          настройках вашего устройства в разделе «Уведомления».
        </Text>

        <Text style={styles.sectionTitle}>4. Хранение данных</Text>
        <Text style={styles.body}>
          Ваши данные хранятся на защищённых серверах. Мы применяем стандартные отраслевые меры
          безопасности для защиты информации от несанкционированного доступа, изменения или
          уничтожения. Данные аккаунта хранятся до момента его удаления.
        </Text>

        <Text style={styles.sectionTitle}>5. Ваши права</Text>
        <Text style={styles.body}>
          Вы имеете право в любой момент:
        </Text>
        <Text style={styles.bullet}>- Запросить доступ к вашим персональным данным</Text>
        <Text style={styles.bullet}>- Исправить неточные данные</Text>
        <Text style={styles.bullet}>- Удалить свой аккаунт и все связанные данные (через раздел «Настройки»)</Text>
        <Text style={styles.bullet}>- Отозвать согласие на обработку данных</Text>

        <Text style={styles.sectionTitle}>6. Изменения политики</Text>
        <Text style={styles.body}>
          Мы можем периодически обновлять настоящую Политику конфиденциальности. Об изменениях
          мы уведомим вас через приложение или по email. Продолжение использования сервиса после
          публикации изменений означает ваше согласие с новой редакцией.
        </Text>

        <Text style={styles.sectionTitle}>7. Контакты</Text>
        <Text style={styles.body}>
          Если у вас есть вопросы относительно настоящей Политики конфиденциальности или обработки
          ваших персональных данных, пожалуйста, свяжитесь с нами:
        </Text>
        <Text style={styles.contact}>support@travelai.app</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>TravelAI — ваш AI-ассистент для путешествий</Text>
          <Text style={styles.footerText}>Версия политики: 1.0.0 от 01.01.2026</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 58,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerRight: {
    width: 38,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  updated: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  intro: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Sora',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: 8,
  },
  bullet: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    color: Colors.textMuted,
    lineHeight: 22,
    paddingLeft: 8,
    marginBottom: 4,
  },
  emphasis: {
    color: Colors.text,
    marginTop: 8,
    fontWeight: Typography.weights.medium,
  },
  contact: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.base,
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
    marginTop: 4,
    marginBottom: 8,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    gap: 4,
  },
  footerText: {
    fontFamily: 'Inter',
    fontSize: Typography.sizes.xs,
    color: Colors.textDisabled,
    textAlign: 'center',
  },
});
