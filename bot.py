import logging
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
import json
import os
from dotenv import load_dotenv

load_dotenv()  # Загружаем токен из файла .env

BOT_TOKEN = os.getenv('BOT_TOKEN')  # Берём токен из переменной

# Проверяем, что токен загрузился
if not BOT_TOKEN:
    raise ValueError("Токен не найден! Создайте файл .env с BOT_TOKEN=ваш_токен")

logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

user_tasks = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = f"👋 Привет, {user.first_name}!\n\nЭто менеджер задач. Нажми кнопку ниже чтобы открыть приложение."
    
    keyboard = [[InlineKeyboardButton("🚀 Открыть", web_app=WebAppInfo(url="https://ВАШ-САЙТ.com"))]]
    await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))

async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        data = json.loads(update.effective_message.web_app_data.data)
        user_id = update.effective_user.id
        logger.info(f"Получено: {data['type']}")
        
        if data['type'] == 'new_task':
            task = data['task']
            if user_id not in user_tasks:
                user_tasks[user_id] = []
            user_tasks[user_id].append(task)
            await update.effective_message.reply_text(f"✅ Задача '{task['title']}' создана!")
            
        elif data['type'] == 'task_completed':
            task_id = data['taskId']
            reward = data['reward']
            if user_id in user_tasks:
                user_tasks[user_id] = [t for t in user_tasks[user_id] if t['id'] != task_id]
            await update.effective_message.reply_text(f"🎉 Молодец! +{reward} монет!")
            
        elif data['type'] == 'task_deleted':
            task_id = data['taskId']
            if user_id in user_tasks:
                user_tasks[user_id] = [t for t in user_tasks[user_id] if t['id'] != task_id]
            await update.effective_message.reply_text(f"🗑 Задача удалена.")
            
        elif data['type'] == 'vacation_bought':
            hours = data['hours']
            await update.effective_message.reply_text(f"😴 Все задачи перенесены на {hours} часов!")
            
    except Exception as e:
        logger.error(f"Ошибка: {e}")
        await update.effective_message.reply_text("❌ Ошибка")

async def tasks_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in user_tasks or not user_tasks[user_id]:
        await update.message.reply_text("📭 Нет активных задач")
        return
    
    active = [t for t in user_tasks[user_id] if not t.get('completed', False)]
    if not active:
        await update.message.reply_text("📭 Нет активных задач")
        return
    
    text = "📋 Твои задачи:\n\n"
    for i, task in enumerate(active, 1):
        deadline = datetime.fromisoformat(task['deadline'].replace('Z', ''))
        time_left = deadline - datetime.now()
        
        if time_left.total_seconds() > 0:
            days = time_left.days
            hours = time_left.seconds // 3600
            time_str = f"{days}д {hours}ч" if days > 0 else f"{hours}ч"
        else:
            time_str = "Просрочено"
        
        text += f"{i}. {task['title']}\n   Сложность: {task['difficulty']}\n   Награда: {task['reward']} монет\n   {time_str}\n\n"
    
    await update.message.reply_text(text)

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("tasks", tasks_command))
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    
    print("🤖 Бот запущен!")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()