import logging
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
import json

BOT_TOKEN = "8286449292:AAHo4YEACa2Yk18pEpI8DJ6tqQn1YJ5wL4I"

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

logger = logging.getLogger(__name__)
user_tasks = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    welcome_text = f"""
👋 Привет, {user.first_name}!

Я помогу тебе управлять задачами и зарабатывать монеты.
Нажми кнопку ниже, чтобы открыть приложение!
    """
    
    webapp_url = "https://ваш-сайт.com"
    
    keyboard = [[
        InlineKeyboardButton(
            "🚀 Открыть Task Manager", 
            web_app=WebAppInfo(url=webapp_url)
        )
    ]]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(welcome_text, reply_markup=reply_markup)

async def web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        data = json.loads(update.effective_message.web_app_data.data)
        user_id = update.effective_user.id
        
        logger.info(f"Получены данные: {data}")
        
        if data['type'] == 'new_task':
            task = data['task']
            
            if user_id not in user_tasks:
                user_tasks[user_id] = []
            user_tasks[user_id].append(task)
            
            deadline = datetime.fromisoformat(task['deadline'].replace('Z', ''))
            reminder_time = deadline - timedelta(minutes=task['reminder'])
            
            if reminder_time > datetime.now():
                delay = (reminder_time - datetime.now()).total_seconds()
                context.job_queue.run_once(
                    send_reminder,
                    delay,
                    data={'user_id': user_id, 'task': task},
                    name=f"reminder_{task['id']}"
                )
            
            await update.effective_message.reply_text(
                f"✅ Задача '{task['title']}' создана!\n"
                f"Напомню за {task['reminder']} минут до дедлайна."
            )
            
        elif data['type'] == 'task_completed':
            task_id = data['taskId']
            reward = data['reward']
            
            if user_id in user_tasks:
                user_tasks[user_id] = [t for t in user_tasks[user_id] if t['id'] != task_id]
            
            await update.effective_message.reply_text(
                f"🎉 Молодец! +{reward} монет!"
            )
            
    except Exception as e:
        logger.error(f"Ошибка: {e}")
        await update.effective_message.reply_text("❌ Произошла ошибка")

async def send_reminder(context: ContextTypes.DEFAULT_TYPE):
    job = context.job
    data = job.data
    user_id = data['user_id']
    task = data['task']
    
    try:
        await context.bot.send_message(
            chat_id=user_id,
            text=f"⏰ НАПОМИНАНИЕ!\n\n"
                 f"Задача: {task['title']}\n"
                 f"Дедлайн через {task['reminder']} минут!\n"
                 f"Награда: {task['reward']} монет"
        )
    except Exception as e:
        logger.error(f"Ошибка отправки: {e}")

async def tasks_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    if user_id not in user_tasks or not user_tasks[user_id]:
        await update.message.reply_text("📭 У тебя нет активных задач")
        return
    
    active = [t for t in user_tasks[user_id] if not t.get('completed', False)]
    
    if not active:
        await update.message.reply_text("📭 У тебя нет активных задач")
        return
    
    text = "📋 ТВОИ ЗАДАЧИ:\n\n"
    for i, task in enumerate(active, 1):
        deadline = datetime.fromisoformat(task['deadline'].replace('Z', ''))
        time_left = deadline - datetime.now()
        
        if time_left.total_seconds() > 0:
            hours = int(time_left.total_seconds() // 3600)
            minutes = int((time_left.total_seconds() % 3600) // 60)
            time_str = f"⏳ Осталось: {hours}ч {minutes}м"
        else:
            time_str = "⚠️ ПРОСРОЧЕНО!"
        
        text += f"{i}. {task['title']}\n"
        text += f"   Сложность: {task['difficulty']}\n"
        text += f"   Награда: {task['reward']} монет\n"
        text += f"   {time_str}\n\n"
    
    await update.message.reply_text(text)

def main():
    application = Application.builder().token(BOT_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("tasks", tasks_command))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
    
    print("🤖 Бот запущен! Нажми Ctrl+C для остановки")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()