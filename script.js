// Инициализируем Telegram Mini App
const tg = window.Telegram.WebApp;

// === 1. ОПРЕДЕЛЯЕМ И ПРИМЕНЯЕМ ТЕМУ ===
function applyTheme() {
    if (tg.colorScheme === "dark") {
        document.body.classList.add('dark-theme');
        console.log("✅ Применена тёмная тема Telegram");
    } else {
        document.body.classList.remove('dark-theme');
        console.log("✅ Применена светлая тема Telegram");
    }
}

// Применяем тему сразу
applyTheme();

// Слушаем смену темы
tg.onEvent('themeChanged', applyTheme);

// === 2. НАСТРОЙКА ИНТЕРФЕЙСА ===
tg.expand(); // Раскрыть на весь экран
tg.MainButton.text = "Закрыть";
tg.MainButton.show();

// === 3. ПРИВЕТСТВИЕ ПОЛЬЗОВАТЕЛЯ ===
const user = tg.initDataUnsafe.user;
if (user) {
    const welcome = document.getElementById('welcome');
    if (welcome) {
        welcome.innerHTML = `Привет, ${user.first_name}! 👋`;
    }
}

// === 4. КНОПКА "ЗАКРЫТЬ" ===
tg.MainButton.onClick(function() {
    tg.close();
});

// === 5. КНОПКА "НАЖМИ МЕНЯ" ===
const mainButton = document.getElementById('main-button');
if (mainButton) {
    mainButton.addEventListener('click', function() {
        tg.showPopup({
            title: "Ура! 🎉",
            message: `Тема: ${tg.colorScheme === "dark" ? "Тёмная 🌙" : "Светлая ☀️"}`,
            buttons: [{ type: "close" }]
        });
    });
}

// === 6. ОТПРАВКА ДАННЫХ ИЗ ФОРМ ===
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(event) {
        event.preventDefault(); // Отменяем стандартную отправку
        
        const input = this.querySelector('input[type="text"]');
        if (input && input.value) {
            tg.showAlert(`Отправлено: "${input.value}"`);
            input.value = ""; // Очищаем поле
        }
    });
});

// === 7. ИНФОРМАЦИЯ ДЛЯ ОТЛАДКИ ===
console.log("=== Telegram Mini App ===");
console.log("Тема:", tg.colorScheme);
console.log("Платформа:", tg.platform);
console.log("Версия:", tg.version);
console.log("Пользователь:", user ? `${user.first_name} (ID: ${user.id})` : "не определен");