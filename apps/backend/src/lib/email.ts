import nodemailer from 'nodemailer';

// Create transporter — real SMTP if configured, otherwise jsonTransport stub
function createTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Stub: logs message to console, does not actually send
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = createTransporter();

const FROM_ADDRESS = process.env.SMTP_FROM ?? '"TravelAI" <no-reply@travel-ai.app>';

// Send a message and log the result when using jsonTransport stub
async function sendMail(options: nodemailer.SendMailOptions): Promise<void> {
  const info = await transporter.sendMail(options);
  if (!process.env.SMTP_HOST) {
    // jsonTransport stores the serialised message in info.message
    console.log('[email stub]', (info as { message?: string }).message ?? JSON.stringify(info));
  }
}

export const emailService = {
  // Send booking confirmation email — fire-and-forget safe
  async sendBookingConfirmation(
    to: string,
    data: {
      bookingId: string;
      type: 'FLIGHT' | 'HOTEL';
      totalPrice: number;
      currency: string;
      details: object;
    },
  ): Promise<void> {
    const typeLabel = data.type === 'FLIGHT' ? 'Авиабилет' : 'Отель';
    const shortId = data.bookingId.slice(0, 8).toUpperCase();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #2563eb;">Бронирование подтверждено ✈️</h2>
        <p>Ваше бронирование успешно подтверждено. Детали ниже:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f1f5f9;">
            <td style="padding: 10px; font-weight: bold;">Номер брони</td>
            <td style="padding: 10px;">${shortId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Тип</td>
            <td style="padding: 10px;">${typeLabel}</td>
          </tr>
          <tr style="background: #f1f5f9;">
            <td style="padding: 10px; font-weight: bold;">Сумма</td>
            <td style="padding: 10px;">${data.totalPrice} ${data.currency}</td>
          </tr>
        </table>
        <p style="color: #64748b; font-size: 14px;">Спасибо за использование TravelAI!</p>
      </div>
    `;

    await sendMail({
      from: FROM_ADDRESS,
      to,
      subject: 'Бронирование подтверждено ✈️',
      html,
    });
  },

  // Send welcome email after successful registration
  async sendWelcome(to: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #2563eb;">Добро пожаловать в TravelAI, ${name}!</h2>
        <p>Рады видеть вас в нашем сервисе. Теперь вы можете искать лучшие рейсы и отели с помощью искусственного интеллекта.</p>
        <p>Начните прямо сейчас — откройте приложение и задайте вопрос нашему ИИ-помощнику.</p>
        <p style="color: #64748b; font-size: 14px;">Команда TravelAI</p>
      </div>
    `;

    await sendMail({
      from: FROM_ADDRESS,
      to,
      subject: 'Добро пожаловать в TravelAI',
      html,
    });
  },

  // Send password reset link
  async sendPasswordReset(to: string, resetToken: string): Promise<void> {
    const appUrl = process.env.APP_URL ?? 'https://travel-ai.app';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #2563eb;">Сброс пароля TravelAI</h2>
        <p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>
        <p>Перейдите по ссылке ниже, чтобы задать новый пароль. Ссылка действительна в течение 1 часа.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}"
             style="background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Сбросить пароль
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">
          Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
        </p>
        <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">
          Прямая ссылка: ${resetLink}
        </p>
      </div>
    `;

    await sendMail({
      from: FROM_ADDRESS,
      to,
      subject: 'Сброс пароля TravelAI',
      html,
    });
  },
};
