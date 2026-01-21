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
// Добавим в начало глобальных переменных
let userStats = {
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    overdueTasks: 0,
    joinDate: new Date().toISOString(),
    achievements: [],
    purchasedItems: {
        dark_theme: false,
        contrast_theme: false,
        haster_combat: false,
        minesweeper: false,
        custom_color: false
    },
    customColor: '#6a11cb',
    isDarkTheme: false
};

// Игровые переменные
let gameInterval;
let gameTime = 60;
let gameScore = 0;
let gameCoins = 0;
let gameActive = false;

// Обновим initializeApp
function initializeApp() {
    // Получаем данные пользователя из Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const tgUser = tg.initDataUnsafe.user;
        userData.username = tgUser.username || `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Друг';
        userData.userId = tgUser.id;
    }
    
    // Загружаем сохраненные данные
    loadUserData();
    loadTasks();
    
    // Применяем сохранённые настройки
    applySettings();
    
    // Обновляем интерфейс
    updateUserInfo();
    renderTasks();
    updateProfileStats();
}

// Загрузка данных пользователя
function loadUserData() {
    const savedData = localStorage.getItem('userStats');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        userStats = { ...userStats, ...parsed };
        userStats.joinDate = parsed.joinDate || userStats.joinDate;
    }
    
    // Сохраняем дату первого входа
    if (!localStorage.getItem('firstVisit')) {
        localStorage.setItem('firstVisit', new Date().toISOString());
        userStats.joinDate = localStorage.getItem('firstVisit');
    }
}

// Сохранение данных пользователя
function saveUserData() {
    localStorage.setItem('userStats', JSON.stringify(userStats));
    applySettings();
}

// Применение настроек
function applySettings() {
    // Тёмная тема
    if (userStats.isDarkTheme) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    
    // Пользовательский цвет
    if (userStats.customColor) {
        document.documentElement.style.setProperty('--primary-color', userStats.customColor);
        document.documentElement.style.setProperty('--secondary-color', adjustColor(userStats.customColor, 30));
    }
    
    // Обновляем UI магазина
    updateShopUI();
}

// Функция для настройки цветов
function adjustColor(color, amount) {
    let usePound = false;
    if (color[0] === "#") {
        color = color.slice(1);
        usePound = true;
    }
    
    const num = parseInt(color, 16);
    let r = (num >> 16) + amount;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    
    let b = ((num >> 8) & 0x00FF) + amount;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    
    let g = (num & 0x0000FF) + amount;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Обновим setupEventListeners
function setupEventListeners() {
    // ... существующие обработчики ...
    
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switch (this.dataset.section) {
                case 'tasks':
                    showMainApp();
                    break;
                case 'shop':
                    showShop();
                    break;
                case 'profile':
                    showProfile();
                    break;
            }
        });
    });
    
    // Профиль
    document.getElementById('dark-mode-toggle').addEventListener('change', toggleDarkMode);
    document.getElementById('notifications-toggle').addEventListener('change', toggleNotifications);
    
    // Магазин
    setupShopEventListeners();
    
    // Игры
    document.getElementById('start-game').addEventListener('click', startHasterGame);
    document.getElementById('cashout-game').addEventListener('click', cashoutGame);
}

// Показать профиль
function showProfile() {
    updateProfileStats();
    document.getElementById('main-app').classList.remove('active');
    document.getElementById('profile-modal').classList.add('active');
    
    // Заполняем данные профиля
    const tgUser = tg.initDataUnsafe?.user;
    if (tgUser) {
        if (tgUser.photo_url) {
            document.getElementById('user-avatar').src = tgUser.photo_url;
        }
        document.getElementById('profile-username').textContent = 
            `@${tgUser.username || 'user_' + tgUser.id}`;
        document.getElementById('user-id').textContent = tgUser.id;
    }
    
    document.getElementById('join-date').textContent = 
        new Date(userStats.joinDate).toLocaleDateString('ru-RU');
    
    // Статус пользователя
    const statusIndicator = document.getElementById('status-indicator');
    const hasActiveTasks = userStats.activeTasks > 0;
    statusIndicator.className = 'avatar-status ' + 
        (hasActiveTasks ? 'status-busy' : 'status-online');
}

// Обновить статистику профиля
function updateProfileStats() {
    // Пересчитываем статистику
    userStats.totalTasks = tasks.length;
    userStats.completedTasks = tasks.filter(t => t.completed).length;
    userStats.activeTasks = tasks.filter(t => !t.completed && new Date(t.deadline) > new Date()).length;
    userStats.overdueTasks = tasks.filter(t => !t.completed && new Date(t.deadline) <= new Date()).length;
    
    // Обновляем UI
    document.getElementById('stat-active').textContent = userStats.activeTasks;
    document.getElementById('stat-completed').textContent = userStats.completedTasks;
    document.getElementById('stat-overdue').textContent = userStats.overdueTasks;
    document.getElementById('stat-total').textContent = userStats.totalTasks;
    
    // Коэффициент выполнения
    const completionRate = userStats.totalTasks > 0 
        ? Math.round((userStats.completedTasks / userStats.totalTasks) * 100)
        : 0;
    
    document.getElementById('completion-rate').textContent = completionRate + '%';
    document.getElementById('progress-fill').style.width = completionRate + '%';
    
    saveUserData();
}

// Переключение тёмной темы
function toggleDarkMode() {
    userStats.isDarkTheme = !userStats.isDarkTheme;
    saveUserData();
    applySettings();
    showNotification(`Тёмная тема ${userStats.isDarkTheme ? 'включена' : 'отключена'}`);
}

// Переключение уведомлений
function toggleNotifications() {
    const enabled = document.getElementById('notifications-toggle').checked;
    showNotification(`Уведомления ${enabled ? 'включены' : 'отключены'}`);
}

// Показать магазин
function showShop() {
    document.getElementById('main-app').classList.remove('active');
    document.getElementById('shop-modal').classList.add('active');
    updateShopBalance();
}

// Настройка обработчиков магазина
function setupShopEventListeners() {
    // Вкладки магазина
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.shop-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
        });
    });
    
    // Покупка предметов
    document.querySelectorAll('.shop-buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.dataset.item;
            buyShopItem(item);
        });
    });
    
    // Выбор цвета
    document.getElementById('color-picker').addEventListener('input', function() {
        document.getElementById('color-hex').value = this.value;
        previewColor(this.value);
    });
    
    document.getElementById('color-hex').addEventListener('input', function() {
        const color = this.value;
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            document.getElementById('color-picker').value = color;
            previewColor(color);
        }
    });
    
    // Пресеты цветов
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', function() {
            const color = this.dataset.color;
            document.getElementById('color-picker').value = color;
            document.getElementById('color-hex').value = color;
            previewColor(color);
        });
    });
    
    // Применение цвета
    document.getElementById('apply-color').addEventListener('click', function() {
        const color = document.getElementById('color-hex').value;
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            buyShopItem('custom_color', color);
        } else {
            showNotification('Введите корректный HEX-код цвета!', 'error');
        }
    });
}

// Обновить баланс в магазине
function updateShopBalance() {
    document.getElementById('shop-balance').textContent = userData.balance;
}

// Обновить UI магазина
function updateShopUI() {
    // Тёмная тема
    const darkThemeBtn = document.querySelector('[data-item="dark_theme"]');
    if (userStats.purchasedItems.dark_theme) {
        darkThemeBtn.innerHTML = userStats.isDarkTheme ? 'Выключить' : 'Включить';
        darkThemeBtn.classList.add('owned');
        darkThemeBtn.onclick = () => toggleDarkMode();
    } else {
        darkThemeBtn.innerHTML = 'Купить';
        darkThemeBtn.classList.remove('owned');
        darkThemeBtn.onclick = () => buyShopItem('dark_theme');
    }
    
    // Haster Combat
    const hasterBtn = document.querySelector('[data-item="haster_combat"]');
    if (userStats.purchasedItems.haster_combat) {
        hasterBtn.innerHTML = 'Играть';
        hasterBtn.classList.add('owned');
        hasterBtn.onclick = () => startHasterGame();
    }
    
    // Сапёр
    const minesweeperBtn = document.querySelector('[data-item="minesweeper"]');
    if (userStats.purchasedItems.minesweeper) {
        minesweeperBtn.innerHTML = 'Играть';
        minesweeperBtn.classList.add('owned');
        minesweeperBtn.onclick = () => showNotification('Сапёр скоро будет доступен!', 'info');
    }
    
    // Кастомный цвет
    if (userStats.purchasedItems.custom_color) {
        document.querySelector('[data-item="custom_color"]').style.display = 'none';
        document.getElementById('apply-color').textContent = 'Применить цвет';
    }
}

// Покупка предмета в магазине
function buyShopItem(item, color = null) {
    const prices = {
        'dark_theme': 30,
        'contrast_theme': 50,
        'haster_combat': 40,
        'minesweeper': 20,
        'custom_color': 25
    };
    
    const price = prices[item];
    
    if (userStats.purchasedItems[item] && item !== 'custom_color') {
        // Если уже куплено - активируем
        if (item === 'dark_theme') {
            toggleDarkMode();
        }
        return;
    }
    
    if (userData.balance < price) {
        showNotification('Недостаточно монет!', 'error');
        return;
    }
    
    if (confirm(`Купить ${getItemName(item)} за ${price} монет?`)) {
        // Списываем монеты
        userData.balance -= price;
        
        // Разблокируем предмет
        userStats.purchasedItems[item] = true;
        
        if (item === 'custom_color' && color) {
            userStats.customColor = color;
        }
        
        // Сохраняем и обновляем
        saveUserData();
        updateUserInfo();
        updateShopBalance();
        updateShopUI();
        
        // Применяем изменения
        if (item === 'custom_color' && color) {
            applyCustomColor(color);
        }
        
        showNotification(`${getItemName(item)} куплено!`, 'success');
    }
}

// Получить название предмета
function getItemName(item) {
    const names = {
        'dark_theme': 'Тёмную тему',
        'contrast_theme': 'Контрастную тему',
        'haster_combat': 'Haster Combat',
        'minesweeper': 'Сапёр',
        'custom_color': 'Кастомный цвет'
    };
    return names[item] || 'Предмет';
}

// Предпросмотр цвета
function previewColor(color) {
    const preview = document.getElementById('color-preview');
    preview.style.setProperty('--primary-color', color);
    
    const adjustedColor = adjustColor(color, 30);
    preview.style.setProperty('--secondary-color', adjustedColor);
}

// Применить кастомный цвет
function applyCustomColor(color) {
    userStats.customColor = color;
    saveUserData();
    showNotification('Цвет интерфейса изменён!', 'success');
}

// Игра Haster Combat
function startHasterGame() {
    if (!userStats.purchasedItems.haster_combat) {
        showNotification('Сначала купите игру в магазине!', 'error');
        return;
    }
    
    closeAllModals();
    document.getElementById('game-modal').classList.add('active');
    
    // Сброс игры
    gameTime = 60;
    gameScore = 0;
    gameCoins = 0;
    gameActive = false;
    
    // Очищаем поле
    const gameContainer = document.getElementById('haster-game');
    gameContainer.innerHTML = '';
    
    // Обновляем UI
    document.getElementById('game-score').textContent = gameScore;
    document.getElementById('game-time').textContent = gameTime;
    document.getElementById('game-coins').textContent = gameCoins;
    
    document.getElementById('start-game').disabled = false;
    document.getElementById('cashout-game').disabled = true;
}

// Создать игровые ноды
function createGameNodes() {
    const container = document.getElementById('haster-game');
    container.innerHTML = '';
    
    for (let i = 0; i < 8; i++) {
        const node = document.createElement('div');
        node.className = 'hack-node';
        node.textContent = Math.floor(Math.random() * 10);
        
        const x = Math.random() * 80 + 10;
        const y = Math.random() * 70 + 15;
        
        node.style.left = x + '%';
        node.style.top = y + '%';
        
        node.addEventListener('click', () => destroyNode(node));
        container.appendChild(node);
    }
}

// Уничтожить ноду
function destroyNode(node) {
    if (!gameActive || node.classList.contains('destroyed')) return;
    
    node.classList.add('destroyed');
    gameScore += parseInt(node.textContent) || 1;
    document.getElementById('game-score').textContent = gameScore;
    
    setTimeout(() => {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
            
            // Создаем новую ноду через 0.5 секунды
            setTimeout(() => {
                if (gameActive) createGameNodes();
            }, 500);
        }
    }, 500);
}

// Таймер игры
function startGameTimer() {
    gameActive = true;
    createGameNodes();
    
    document.getElementById('start-game').disabled = true;
    document.getElementById('cashout-game').disabled = false;
    
    gameInterval = setInterval(() => {
        gameTime--;
        document.getElementById('game-time').textContent = gameTime;
        
        // Конвертируем очки в монеты каждые 10 секунд
        if (gameTime % 10 === 0 && gameScore > 0) {
            gameCoins += Math.floor(gameScore / 5);
            document.getElementById('game-coins').textContent = gameCoins;
        }
        
        if (gameTime <= 0) {
            endGame();
        }
    }, 1000);
}

// Забрать монеты
function cashoutGame() {
    if (gameCoins > 0) {
        userData.balance += gameCoins;
        updateUserInfo();
        showNotification(`Вы получили ${gameCoins} монет из игры!`, 'success');
    }
    endGame();
}

// Конец игры
function endGame() {
    gameActive = false;
    clearInterval(gameInterval);
    
    document.getElementById('start-game').disabled = false;
    document.getElementById('cashout-game').disabled = true;
    
    const container = document.getElementById('haster-game');
    container.innerHTML = '<h3 style="color: white; text-align: center; margin-top: 100px;">Игра окончена!</h3>';
}

// ОБНОВЛЕНИЕ: Добавляем CD на выполнение задач
function calculateMinCompletionTime(taskHours) {
    // Минимальное время выполнения в минутах
    // 1 час = 30 мин минимально, 5 мин = 1 мин минимально и т.д.
    if (taskHours <= 0.083) return 1; // 5 минут = минимум 1 минута
    if (taskHours <= 0.5) return taskHours * 60 * 0.2; // до 30 минут = 20% времени
    if (taskHours <= 1) return taskHours * 60 * 0.15; // до 1 часа = 15% времени
    if (taskHours <= 4) return taskHours * 60 * 0.1; // до 4 часов = 10% времени
    return taskHours * 60 * 0.05; // более 4 часов = 5% времени
}

// Обновляем completeTask с проверкой CD
function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Проверяем минимальное время выполнения
    const now = new Date();
    const created = new Date(task.createdAt);
    const timePassed = (now - created) / (1000 * 60); // в минутах
    
    const taskHours = parseFloat(task.deadlineHours || 24);
    const minTime = calculateMinCompletionTime(taskHours);
    
    if (timePassed < minTime) {
        const remainingTime = Math.ceil(minTime - timePassed);
        showNotification(`Подождите еще ${remainingTime} минут перед завершением задачи!`, 'error');
        return;
    }
    
    // ... остальная логика выполнения задачи (как было) ...
    
    // После выполнения обновляем статистику профиля
    updateProfileStats();
}

// Добавляем в saveNewTask запись времени создания
function saveNewTask() {
    // ... существующая валидация ...
    
    const newTask = {
        id: Date.now().toString(),
        title: titleInput.value.trim(),
        deadline: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
        deadlineHours: hours, // сохраняем часы для CD
        reminder: parseInt(reminderInput.value),
        difficulty: currentDifficulty,
        reward: parseFloat(document.getElementById('total-reward').textContent),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    // ... остальная логика ...
}

// Обновляем switchNavigation для работы с модалками
function switchNavigation(section) {
    closeAllModals();
    
    switch (section) {
        case 'tasks':
            // Уже на главном экране
            break;
        case 'shop':
            showShop();
            break;
        case 'profile':
            showProfile();
            break;
    }
}

// Экспортируем новые функции
window.showProfile = showProfile;
window.showShop = showShop;
window.startHasterGame = startHasterGame;
window.cashoutGame = cashoutGame;

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