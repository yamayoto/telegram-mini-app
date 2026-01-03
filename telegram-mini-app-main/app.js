// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрываем приложение на весь экран
tg.setHeaderColor('#6a11cb');
tg.setBackgroundColor('#f5f7fa');

// Глобальные переменные
let userData = {
    username: 'Пользователь',
    balance: 25,
    completedTasks: 3,
    activeTasks: 2
};

let tasks = [];
let currentDifficulty = 'medium';
let difficultyMultipliers = {
    'easy': 0.5,
    'medium': 1.0,
    'hard': 2.0
};

// Мотивационные фразы
const motivationPhrases = [
    "Отличный день, чтобы выполнить задачи!",
    "Начиная с малого, можно добиться большого!",
    "Каждая выполненная задача — шаг к успеху!",
    "Ты можешь больше, чем думаешь!",
    "Сегодня — идеальный день для продуктивности!",
    "Маленькие шаги приводят к большим результатам!",
    "Дисциплина — это путь к свободе!",
    "Твое будущее создается сегодня!",
    "Не откладывай на завтра то, что можно сделать сейчас!",
    "Успех — это сумма небольших усилий, повторяемых изо дня в день!"
];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    showWelcomeScreen();
});

// Инициализация данных
function initializeApp() {
    // Получаем данные пользователя из Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const tgUser = tg.initDataUnsafe.user;
        userData.username = tgUser.username || `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Друг';
    }
    
    // Загружаем сохраненные задачи из localStorage
    loadTasks();
    
    // Обновляем интерфейс
    updateUserInfo();
    renderTasks();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка "Приступить!"
    document.getElementById('start-btn').addEventListener('click', showMainApp);
    
    // Кнопки навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchNavigation(this.dataset.section);
        });
    });
    
    // Кнопки действий
    document.getElementById('add-task-btn').addEventListener('click', () => showModal('task-modal'));
    document.getElementById('shop-btn').addEventListener('click', () => showModal('shop-modal'));
    document.getElementById('earn-btn').addEventListener('click', () => showModal('earn-modal'));
    document.getElementById('refresh-btn').addEventListener('click', refreshData);
    
    // Кнопки закрытия модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Закрытие модалок при клике на фон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeAllModals();
        });
    });
    
    // Обработка формы добавления задачи
    setupTaskForm();
    
    // Обработка магазина
    setupShop();
}

// Экран приветствия
function showWelcomeScreen() {
    // Устанавливаем случайную мотивационную фразу
    const randomPhrase = motivationPhrases[Math.floor(Math.random() * motivationPhrases.length)];
    document.getElementById('motivation-text').textContent = randomPhrase;
    
    // Устанавливаем имя пользователя
    document.getElementById('username').textContent = userData.username;
    
    // Показываем кнопку "Приступить!" через 3 секунды
    setTimeout(() => {
        document.getElementById('loading-dots').classList.add('hidden');
        document.getElementById('start-btn').classList.remove('hidden');
    }, 3000);
}

// Показать основное приложение
function showMainApp() {
    document.getElementById('welcome-screen').classList.remove('active');
    document.getElementById('main-app').classList.add('active');
    updateUserInfo();
}

// Обновить информацию о пользователе
function updateUserInfo() {
    document.getElementById('balance-value').textContent = userData.balance;
    document.getElementById('completed-value').textContent = userData.completedTasks;
    document.getElementById('active-value').textContent = userData.activeTasks;
}

// Загрузка задач из localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('userTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        updateTaskCounters();
    }
}

// Сохранение задач в localStorage
function saveTasks() {
    localStorage.setItem('userTasks', JSON.stringify(tasks));
    updateTaskCounters();
}

// Обновление счетчиков задач
function updateTaskCounters() {
    userData.activeTasks = tasks.filter(task => !task.completed).length;
    userData.completedTasks = tasks.filter(task => task.completed).length;
    updateUserInfo();
}

// Отображение задач
function renderTasks() {
    const container = document.getElementById('tasks-container');
    
    if (tasks.length === 0 || tasks.every(task => task.completed)) {
        container.innerHTML = `
            <div class="empty-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>У вас еще нет задач, задайте первую задачу!</p>
            </div>
        `;
        return;
    }
    
    // Сортируем задачи по дедлайну (самые срочные первые)
    const activeTasks = tasks
        .filter(task => !task.completed)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    container.innerHTML = activeTasks.map((task, index) => `
        <div class="task-item" data-id="${task.id}">
            <div class="task-header">
                <div class="task-title">${index + 1}. ${task.title}</div>
                <div class="task-deadline">${formatTimeLeft(task.deadline)}</div>
            </div>
            <div class="task-difficulty">
                <i class="fas fa-chart-line"></i>
                Сложность: ${getDifficultyText(task.difficulty)}
            </div>
            <div class="task-actions">
                <div class="task-reward">
                    <i class="fas fa-coins"></i>
                    ${task.reward.toFixed(1)} монет
                </div>
                <button class="complete-btn" onclick="completeTask('${task.id}')">
                    <i class="fas fa-check"></i> Выполнить!
                </button>
            </div>
        </div>
    `).join('');
}

// Форматирование оставшегося времени
function formatTimeLeft(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
        return `${diffHours}ч ${diffMinutes}м`;
    } else if (diffMinutes > 0) {
        return `${diffMinutes}м`;
    } else {
        return 'Просрочено';
    }
}

// Получить текст сложности
function getDifficultyText(level) {
    const texts = {
        'easy': 'Легкая',
        'medium': 'Средняя',
        'hard': 'Сложная'
    };
    return texts[level] || level;
}

// Настройка формы добавления задачи
function setupTaskForm() {
    const deadlineInput = document.getElementById('task-deadline');
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const saveButton = document.getElementById('save-task-btn');
    
    // Выбор сложности
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            difficultyButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDifficulty = this.dataset.level;
            updateRewardPreview();
        });
    });
    
    // Обновление предпросмотра награды при изменении времени
    deadlineInput.addEventListener('input', updateRewardPreview);
    
    // Сохранение задачи
    saveButton.addEventListener('click', saveNewTask);
    
    // Активируем среднюю сложность по умолчанию
    document.querySelector('.difficulty-btn[data-level="medium"]').click();
}

// Обновление предпросмотра награды
function updateRewardPreview() {
    const hours = parseInt(document.getElementById('task-deadline').value) || 24;
    const baseReward = hours * 0.1; // 0.1 монеты за минуту = 6 монет за час
    const multiplier = difficultyMultipliers[currentDifficulty];
    const totalReward = baseReward * multiplier;
    
    document.getElementById('base-reward').textContent = baseReward.toFixed(1);
    document.getElementById('difficulty-bonus-text').textContent = `+${((multiplier - 1) * 100)}%`;
    document.getElementById('total-reward').textContent = totalReward.toFixed(1);
}

// Сохранение новой задачи
function saveNewTask() {
    const titleInput = document.getElementById('task-title');
    const deadlineInput = document.getElementById('task-deadline');
    const reminderInput = document.querySelector('input[name="reminder"]:checked');
    
    // Валидация
    if (!titleInput.value.trim()) {
        showNotification('Введите название задачи!', 'error');
        titleInput.classList.add('error');
        return;
    }
    
    const hours = parseInt(deadlineInput.value);
    if (isNaN(hours) || hours < 1 || hours > 720) {
        showNotification('Введите корректное время (1-720 часов)!', 'error');
        deadlineInput.classList.add('error');
        return;
    }
    
    // Создание задачи
    const newTask = {
        id: Date.now().toString(),
        title: titleInput.value.trim(),
        deadline: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
        reminder: parseInt(reminderInput.value),
        difficulty: currentDifficulty,
        reward: parseFloat(document.getElementById('total-reward').textContent),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    // Добавление задачи
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    
    // Очистка формы
    titleInput.value = '';
    deadlineInput.value = '24';
    titleInput.classList.remove('error');
    deadlineInput.classList.remove('error');
    
    // Закрытие модального окна и уведомление
    closeAllModals();
    showNotification(`Задача "${newTask.title}" добавлена!`, 'success');
    
    // Отправка данных в Telegram бот (для будущей интеграции)
    sendToBot('new_task', newTask);
}

// Завершение задачи
function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Помечаем как выполненную
    task.completed = true;
    task.completedAt = new Date().toISOString();
    
    // Начисляем награду
    const now = new Date();
    const deadline = new Date(task.deadline);
    const isEarly = now < deadline;
    
    let finalReward = task.reward;
    if (isEarly) {
        const completionTime = (deadline - now) / (1000 * 60); // в минутах
        const halfTime = (deadline - new Date(task.createdAt)) / (1000 * 60 * 2);
        if (completionTime > halfTime) {
            finalReward *= 2; // Бонус за быстрое выполнение
        }
    }
    
    userData.balance += finalReward;
    
    // Сохраняем и обновляем
    saveTasks();
    renderTasks();
    updateUserInfo();
    
    // Уведомление
    showNotification(`Задача выполнена! +${finalReward.toFixed(1)} монет`, 'success');
    
    // Отправка в бот
    sendToBot('task_completed', { taskId, reward: finalReward });
}

// Настройка магазина
function setupShop() {
    const buyButtons = document.querySelectorAll('.buy-btn');
    const vacationStatus = document.getElementById('vacation-status');
    
    // Проверяем активный выходной
    const vacationEnd = localStorage.getItem('vacationEnd');
    if (vacationEnd && new Date(vacationEnd) > new Date()) {
        const endDate = new Date(vacationEnd);
        vacationStatus.textContent = `Выходной активен до ${endDate.toLocaleString()}`;
    }
    
    // Обработка покупок
    buyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const hours = parseInt(this.dataset.hours);
            const price = parseInt(this.dataset.price);
            
            if (userData.balance < price) {
                showNotification('Недостаточно монет!', 'error');
                return;
            }
            
            if (confirm(`Купить выходной на ${hours} часов за ${price} монет?`)) {
                buyVacation(hours, price);
            }
        });
    });
}

// Покупка выходного
function buyVacation(hours, price) {
    // Списываем монеты
    userData.balance -= price;
    
    // Устанавливаем выходной
    const endDate = new Date(Date.now() + hours * 60 * 60 * 1000);
    localStorage.setItem('vacationEnd', endDate.toISOString());
    
    // Обновляем интерфейс
    updateUserInfo();
    document.getElementById('vacation-status').textContent = 
        `Выходной активен до ${endDate.toLocaleString()}`;
    
    // Уведомление
    showNotification(`Выходной на ${hours} часов активирован!`, 'success');
    
    // Отправка в бот
    sendToBot('vacation_bought', { hours, price, endDate: endDate.toISOString() });
    
    // Закрываем модальное окно
    closeAllModals();
}

// Переключение навигации
function switchNavigation(section) {
    // Обновляем активную кнопку
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) {
            btn.classList.add('active');
        }
    });
    
    // В будущем здесь будет переключение между разделами
    showNotification(`Раздел "${section}" в разработке`, 'info');
}

// Показать модальное окно
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрыть все модальные окна
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Обновление данных
function refreshData() {
    showNotification('Данные обновлены!', 'success');
    updateUserInfo();
    renderTasks();
}

// Показать уведомление
function showNotification(text, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = text;
    notification.className = 'notification';
    notification.classList.add(type === 'error' ? 'error' : 'success');
    notification.classList.remove('hidden');
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Отправка данных в Telegram бота
function sendToBot(event, data) {
    // В будущем здесь будет интеграция с бэкендом
    console.log(`Отправка в бота: ${event}`, data);
    
    // Для тестирования - эмуляция ответа от бота
    if (event === 'new_task') {
        setTimeout(() => {
            if (Math.random() > 0.5) {
                showNotification('Бот получил вашу задачу!', 'success');
            }
        }, 1000);
    }
}

// Для отладки - добавление тестовых задач
window.addTestTasks = function() {
    const testTasks = [
        {
            id: '1',
            title: 'Прочитать книгу',
            deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            difficulty: 'medium',
            reward: 12.0,
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            title: 'Сделать зарядку',
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            difficulty: 'easy',
            reward: 7.2,
            completed: false,
            createdAt: new Date().toISOString()
        }
    ];
    
    tasks = [...tasks, ...testTasks];
    saveTasks();
    renderTasks();
    showNotification('Тестовые задачи добавлены!', 'success');
};

// Экспорт функций для глобального использования
window.completeTask = completeTask;
window.showModal = showModal;
window.closeAllModals = closeAllModals;