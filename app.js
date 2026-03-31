// ПОДКЛЮЧЕНИЕ TELEGRAM
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ДАННЫЕ ПОЛЬЗОВАТЕЛЯ
let userData = {
    username: 'Пользователь',
    balance: 100,
    userId: null
};

let tasks = [];              // Список всех задач
let currentDifficulty = 'medium';  // Текущая выбранная сложность
let vacationEnd = null;     // Время окончания переноса задач

// МНОЖИТЕЛИ НАГРАДЫ ЗА СЛОЖНОСТЬ
const difficultyMultipliers = {
    'easy': 0.5,
    'medium': 1.0,
    'hard': 2.0
};

// МОТИВАЦИОННЫЕ ФРАЗЫ
const motivationPhrases = [
    "Отличный день для задач!",
    "Начни с малого!",
    "Ты сможешь!"
];

// ЗАПУСК ПРИЛОЖЕНИЯ
document.addEventListener('DOMContentLoaded', function() {
    initTelegramUser();   // Получаем данные из Telegram
    loadData();           // Загружаем сохранённые задачи
    setupEvents();        // Настраиваем кнопки
    showWelcome();        // Показываем приветствие
    updateUI();           // Обновляем интерфейс
    renderTasks();        // Отображаем задачи
    checkVacation();      // Проверяем активный перенос
});

// ПОЛУЧАЕМ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ИЗ TELEGRAM
function initTelegramUser() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        userData.username = user.first_name || 'Пользователь';
        userData.userId = user.id;
        
        document.getElementById('username').textContent = userData.username;
        document.getElementById('profile-name').textContent = '@' + (user.username || 'user_' + user.id);
        document.getElementById('user-id').textContent = user.id;
        
        if (user.photo_url) {
            document.getElementById('user-avatar').src = user.photo_url;
        }
    }
}

// ЗАГРУЗКА СОХРАНЁННЫХ ДАННЫХ
function loadData() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) tasks = JSON.parse(savedTasks);
    
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        userData.balance = parsed.balance || 100;
    }
    
    const savedVacation = localStorage.getItem('vacationEnd');
    if (savedVacation) {
        vacationEnd = new Date(savedVacation);
        if (vacationEnd < new Date()) {
            vacationEnd = null;
            localStorage.removeItem('vacationEnd');
        }
    }
}

// СОХРАНЕНИЕ ДАННЫХ
function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('userData', JSON.stringify(userData));
}

// НАСТРОЙКА КНОПОК
function setupEvents() {
    // Кнопка старта
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('welcome-screen').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
    });
    
    // Кнопки действий
    document.getElementById('add-task-btn').addEventListener('click', () => openModal('task-modal'));
    document.getElementById('shop-btn').addEventListener('click', () => openModal('shop-modal'));
    document.getElementById('homa-btn').addEventListener('click', () => openModal('homa-modal'));
    document.getElementById('refresh-btn').addEventListener('click', () => renderTasks());
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });
    
    // Нижнее меню
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.dataset.section;
            if (section === 'profile') openModal('profile-modal');
            else if (section === 'shop') openModal('shop-modal');
            else closeAllModals();
        });
    });
    
    // Выбор сложности
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDifficulty = this.dataset.level;
            updateReward();
        });
    });
    
    // Изменение времени задачи
    document.getElementById('task-days').addEventListener('input', updateReward);
    document.getElementById('task-hours').addEventListener('input', updateReward);
    document.getElementById('task-minutes').addEventListener('input', updateReward);
    
    // Создание задачи
    document.getElementById('save-task-btn').addEventListener('click', saveNewTask);
    
    // Покупка переноса
    document.querySelectorAll('.vacation-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const hours = parseInt(this.dataset.hours);
            buyVacation(hours);
        });
    });
    
    // Тёмная тема
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        if (this.checked) document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    });
    
    // Клик по Хоме
    const homaImage = document.getElementById('homa-image');
    if (homaImage) homaImage.addEventListener('click', homaClick);
}

// ОТКРЫТЬ МОДАЛЬНОЕ ОКНО
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    if (modalId === 'profile-modal') updateProfileStats();
    if (modalId === 'shop-modal') checkVacation();
    if (modalId === 'homa-modal') updateHomaUI();
}

// ЗАКРЫТЬ ВСЕ ОКНА
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ПОКАЗАТЬ ПРИВЕТСТВИЕ
function showWelcome() {
    const randomIndex = Math.floor(Math.random() * motivationPhrases.length);
    document.getElementById('motivation-text').textContent = motivationPhrases[randomIndex];
    
    setTimeout(() => {
        document.getElementById('loading-dots').classList.add('hidden');
        document.getElementById('start-btn').classList.remove('hidden');
    }, 2000);
}

// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    const activeTasks = tasks.filter(t => !t.completed).length;
    const completedTasks = tasks.filter(t => t.completed).length;
    
    document.getElementById('balance-value').textContent = userData.balance.toFixed(2);
    document.getElementById('completed-value').textContent = completedTasks;
    document.getElementById('active-value').textContent = activeTasks;
    document.getElementById('shop-balance').textContent = userData.balance.toFixed(2);
}

// ОБНОВЛЕНИЕ СТАТИСТИКИ В ПРОФИЛЕ
function updateProfileStats() {
    const completed = tasks.filter(t => t.completed).length;
    const active = tasks.filter(t => !t.completed).length;
    const overdue = tasks.filter(t => !t.completed && new Date(t.deadline) < new Date()).length;
    const total = tasks.length;
    
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-overdue').textContent = overdue;
    document.getElementById('stat-total').textContent = total;
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('completion-rate').textContent = rate;
    document.getElementById('progress-fill').style.width = rate + '%';
    
    const joinDate = localStorage.getItem('joinDate') || new Date().toISOString();
    localStorage.setItem('joinDate', joinDate);
    document.getElementById('join-date').textContent = new Date(joinDate).toLocaleDateString('ru-RU');
}

// ОБНОВЛЕНИЕ НАГРАДЫ В ФОРМЕ
function updateReward() {
    const days = parseInt(document.getElementById('task-days').value) || 0;
    const hours = parseInt(document.getElementById('task-hours').value) || 0;
    const minutes = parseInt(document.getElementById('task-minutes').value) || 1;
    
    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
    const baseReward = totalMinutes * 0.01;
    const totalReward = baseReward * difficultyMultipliers[currentDifficulty];
    
    document.getElementById('total-reward').textContent = totalReward.toFixed(2);
}

// ПОЛУЧИТЬ ОБЩЕЕ ВРЕМЯ В МИНУТАХ
function getTotalMinutes() {
    const days = parseInt(document.getElementById('task-days').value) || 0;
    const hours = parseInt(document.getElementById('task-hours').value) || 0;
    const minutes = parseInt(document.getElementById('task-minutes').value) || 1;
    return (days * 24 * 60) + (hours * 60) + minutes;
}

// СОЗДАНИЕ НОВОЙ ЗАДАЧИ
function saveNewTask() {
    const title = document.getElementById('task-title').value.trim();
    const totalMinutes = getTotalMinutes();
    
    if (!title) {
        showNotification('Введите название!', 'error');
        return;
    }
    
    if (totalMinutes < 1 || totalMinutes > 43200) {
        showNotification('Время от 1 минуты до 30 дней!', 'error');
        return;
    }
    
    const now = new Date();
    let deadline = new Date(now.getTime() + totalMinutes * 60 * 1000);
    
    if (vacationEnd && vacationEnd > now) {
        deadline = new Date(deadline.getTime() + (vacationEnd - now));
    }
    
    const reward = parseFloat(document.getElementById('total-reward').textContent);
    
    const newTask = {
        id: Date.now().toString(),
        title: title,
        deadline: deadline.toISOString(),
        difficulty: currentDifficulty,
        reward: reward,
        completed: false,
        createdAt: now.toISOString(),
        totalMinutes: totalMinutes
    };
    
    tasks.push(newTask);
    saveData();
    renderTasks();
    closeAllModals();
    showNotification('Задача добавлена!', 'success');
    
    document.getElementById('task-title').value = '';
    document.getElementById('task-days').value = '0';
    document.getElementById('task-hours').value = '0';
    document.getElementById('task-minutes').value = '30';
    
    sendToBot('new_task', { task: newTask });
}

// ОТОБРАЖЕНИЕ ЗАДАЧ
function renderTasks() {
    const container = document.getElementById('tasks-container');
    const now = new Date();
    
    let activeTasks = tasks.filter(t => !t.completed);
    
    if (vacationEnd && vacationEnd > now) {
        activeTasks = activeTasks.filter(t => new Date(t.deadline) > vacationEnd);
    }
    
    if (activeTasks.length === 0) {
        container.innerHTML = '<div class="empty-tasks">Нет активных задач</div>';
        return;
    }
    
    activeTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    let html = '';
    activeTasks.forEach((task, index) => {
        const timeLeft = getTimeLeft(task.deadline);
        const canDelete = canDeleteTask(task);
        
        html += `
            <div class="task-item">
                <div class="task-header">
                    <div class="task-title">${index + 1}. ${task.title}</div>
                    <div class="task-deadline">${timeLeft}</div>
                </div>
                <div class="task-difficulty">Сложность: ${getDifficultyText(task.difficulty)}</div>
                <div class="task-actions">
                    <div class="task-reward">💰 ${task.reward.toFixed(2)}</div>
                    <div>
                        <button class="complete-btn" onclick="completeTask('${task.id}')">✅ Выполнить</button>
                        ${canDelete ? `<button class="delete-btn" onclick="deleteTask('${task.id}')">🗑 Удалить</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateUI();
}

// ПОЛУЧИТЬ ТЕКСТ ОСТАВШЕГОСЯ ВРЕМЕНИ
function getTimeLeft(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff < 0) return 'Просрочено';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}д ${hours}ч`;
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
}

// ТЕКСТ СЛОЖНОСТИ
function getDifficultyText(level) {
    const texts = { 'easy': 'Легкая', 'medium': 'Средняя', 'hard': 'Сложная' };
    return texts[level] || level;
}

// ПРОВЕРКА МОЖНО ЛИ УДАЛИТЬ ЗАДАЧУ
function canDeleteTask(task) {
    const now = new Date();
    const created = new Date(task.createdAt);
    const timePassed = (now - created) / (1000 * 60);
    return timePassed > 60 && task.totalMinutes > 60;
}

// ВЫПОЛНЕНИЕ ЗАДАЧИ
window.completeTask = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const now = new Date();
    const created = new Date(task.createdAt);
    const timePassed = (now - created) / (1000 * 60);
    const minTime = task.totalMinutes * 0.1;
    
    if (timePassed < minTime) {
        const remaining = Math.ceil(minTime - timePassed);
        showNotification(`Подождите ${remaining} минут!`, 'error');
        return;
    }
    
    task.completed = true;
    task.completedAt = now.toISOString();
    
    let reward = task.reward;
    const deadline = new Date(task.deadline);
    if (now < deadline) {
        const early = (deadline - now) / (1000 * 60 * 60);
        if (early > task.totalMinutes * 0.5) reward *= 2;
    }
    
    userData.balance += reward;
    saveData();
    renderTasks();
    updateUI();
    showNotification(`+${reward.toFixed(2)} монет!`, 'success');
    
    sendToBot('task_completed', { taskId, reward });
};

// УДАЛЕНИЕ ЗАДАЧИ СО ШТРАФОМ
window.deleteTask = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (confirm('Удалить задачу? Штраф 2 монеты')) {
        if (userData.balance >= 2) {
            userData.balance -= 2;
            tasks = tasks.filter(t => t.id !== taskId);
            saveData();
            renderTasks();
            updateUI();
            showNotification('Задача удалена. -2 монеты', 'info');
            sendToBot('task_deleted', { taskId });
        } else {
            showNotification('Недостаточно монет!', 'error');
        }
    }
};

// ПРОДЛЕНИЕ ЗАДАЧ (ПЕРЕНОС)
function buyVacation(hours) {
    const price = hours * 5;
    
    if (userData.balance < price) {
        showNotification('Недостаточно монет!', 'error');
        return;
    }
    
    if (confirm(`Перенести все задачи на ${hours} часов за ${price} монет?`)) {
        userData.balance -= price;
        
        const now = new Date();
        let newVacationEnd;
        
        if (vacationEnd && vacationEnd > now) {
            newVacationEnd = new Date(vacationEnd.getTime() + hours * 60 * 60 * 1000);
        } else {
            newVacationEnd = new Date(now.getTime() + hours * 60 * 60 * 1000);
        }
        
        vacationEnd = newVacationEnd;
        localStorage.setItem('vacationEnd', vacationEnd.toISOString());
        
        tasks.forEach(task => {
            if (!task.completed) {
                const deadline = new Date(task.deadline);
                task.deadline = new Date(deadline.getTime() + hours * 60 * 60 * 1000).toISOString();
            }
        });
        
        saveData();
        renderTasks();
        checkVacation();
        updateUI();
        closeAllModals();
        showNotification(`Задачи перенесены на ${hours} часов!`, 'success');
        sendToBot('vacation_bought', { hours, price });
    }
}

// ПРОВЕРКА АКТИВНОГО ПЕРЕНОСА
function checkVacation() {
    const now = new Date();
    if (vacationEnd && vacationEnd > now) {
        const diff = vacationEnd - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('vacation-status').textContent = `${hours}ч ${minutes}м`;
    } else {
        document.getElementById('vacation-status').textContent = 'нет';
    }
}

// ХОМА - КЛИК ПО КАРТИНКЕ
let homaToday = 0;
let homaTotal = 0;

function loadHomaData() {
    const saved = localStorage.getItem('homaData');
    if (saved) {
        const data = JSON.parse(saved);
        homaToday = data.today;
        homaTotal = data.total;
        const lastDate = data.date;
        const today = new Date().toDateString();
        if (lastDate !== today) homaToday = 0;
    }
}

function saveHomaData() {
    localStorage.setItem('homaData', JSON.stringify({
        today: homaToday,
        total: homaTotal,
        date: new Date().toDateString()
    }));
}

function updateHomaUI() {
    document.getElementById('homa-today').textContent = homaToday.toFixed(4);
    const percent = (homaToday / 10) * 100;
    document.getElementById('homa-progress').style.width = Math.min(percent, 100) + '%';
    
    const btn = document.getElementById('homa-max-btn');
    if (homaToday >= 10) {
        btn.disabled = true;
        btn.textContent = 'Лимит на сегодня';
    } else {
        btn.disabled = false;
        btn.textContent = 'Кликай по Хоме!';
    }
}

function homaClick() {
    if (homaToday >= 10) {
        showNotification('Лимит на сегодня!', 'error');
        return;
    }
    
    const reward = 0.0001;
    homaToday += reward;
    homaTotal += reward;
    userData.balance += reward;
    
    saveData();
    saveHomaData();
    updateUI();
    updateHomaUI();
    
    const img = document.getElementById('homa-image');
    img.style.transform = 'scale(0.95)';
    setTimeout(() => img.style.transform = 'scale(1)', 100);
    
    showNotification(`+${reward} монет!`, 'success');
}

// УВЕДОМЛЕНИЕ
function showNotification(text, type) {
    const notif = document.getElementById('notification');
    notif.textContent = text;
    notif.classList.remove('hidden');
    
    if (type === 'error') notif.style.background = '#f44336';
    else if (type === 'success') notif.style.background = '#4CAF50';
    else notif.style.background = '#2196F3';
    
    setTimeout(() => notif.classList.add('hidden'), 3000);
}

// ОТПРАВКА В БОТА
function sendToBot(event, data) {
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({ type: event, ...data }));
    }
}

// ЗАГРУЗКА ДАННЫХ ХОМЫ
loadHomaData();