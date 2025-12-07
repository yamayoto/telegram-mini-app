// Инициализация Telegram Mini App
const tg = window.Telegram.WebApp;

// Показываем кнопку закрытия
tg.expand();  // Раскрыть приложение на весь экран
tg.MainButton.text = "Закрыть";
tg.MainButton.show();

// При нажатии на кнопку "Закрыть"
tg.MainButton.onClick(function() {
    tg.close();
});

// Пример: получаем данные пользователя
const user = tg.initDataUnsafe.user;
if (user) {
    console.log("Пользователь:", user);
    
    // Можем показать приветствие
    document.getElementById('welcome').innerHTML = 
        `Привет, ${user.first_name}! 👋`;
}