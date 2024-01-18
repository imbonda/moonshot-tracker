// 3rd party.
import { Telegraf } from 'telegraf';
// Internal
import { telegramConfig } from '../../config';

class Telegram {
    private bot: Telegraf;

    constructor() {
        this.bot = new Telegraf(telegramConfig.BOT_TOKEN);
    }

    public async sendNotification(messgae: string): Promise<void> {
        await this.send(telegramConfig.NOTIFICATIONS_CHAT_ID, messgae);
    }

    private async send(chatId: string, message: string): Promise<void> {
        await this.bot.telegram.sendMessage(
            chatId,
            message,
            {
                parse_mode: 'HTML',
                disable_web_page_preview: false,
            },
        );
    }
}

export const telegram = new Telegram();
