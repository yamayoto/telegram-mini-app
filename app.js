const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let userData = {
    username: 'Пользователь',
    balance: 100,
    completedTasks: 0,
    activeTasks: 0,
    userId: null,
    homaToday: 0,
    homaTotal: 0,
    lastHomaReset: new Date().toDateString()
};

let tasks = [];
let currentDifficulty = 'medium';
let vacationEnd = null;

const difficultyMultipliers = {
    'easy': 0.5,
    'medium': 1.0,
    'hard': 2.0
};

const motivationPhrases = [
    "Отличный день, чтобы выполнить задачи!",
    "Начиная с малого, можно добиться большого!",
    "Каждая выполненная задача — шаг к успеху!",
    "Ты можешь больше, чем думаешь!",
    "Сегодня — идеальный день для продуктивности!"
];

document.addEventListener('DOMContentLoaded', function() {
    initTelegramUser();
    loadData();
    setupEventListeners();
    showWelcomeScreen();
    updateUserInfo();
    renderTasks();
    checkHomaReset();
    checkVacation();
});

function initTelegramUser() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        userData.username = user.first_name || 'Пользователь';
        userData.userId = user.id;
        document.getElementById('username').textContent = userData.username;
        document.getElementById('profile-username').textContent = '@' + (user.username || 'user_' + user.id);
        document.getElementById('user-id').textContent = user.id;
        if (user.photo_url) {
            document.getElementById('user-avatar').src = user.photo_url;
        }
    }
}

function loadData() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        userData.balance = parsed.balance || 100;
        userData.homaToday = parsed.homaToday || 0;
        userData.homaTotal = parsed.homaTotal || 0;
        userData.lastHomaReset = parsed.lastHomaReset || new Date().toDateString();
    }
    
    const savedVacation = localStorage.getItem('vacationEnd');
    if (savedVacation) {
        vacationEnd = new Date(savedVacation);
        if (vacationEnd < new Date()) {
            vacationEnd = null;
            localStorage.removeItem('vacationEnd');
        }
    }
    
    updateTaskCounters();
}

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('userData', JSON.stringify(userData));
    updateTaskCounters();
}

function updateTaskCounters() {
    userData.activeTasks = tasks.filter(t => !t.completed).length;
    userData.completedTasks = tasks.filter(t => t.completed).length;
    updateUserInfo();
    updateProfileStats();
}

function updateUserInfo() {
    document.getElementById('balance-value').textContent = userData.balance.toFixed(2);
    document.getElementById('completed-value').textContent = userData.completedTasks;
    document.getElementById('active-value').textContent = userData.activeTasks;
    document.getElementById('shop-balance').textContent = userData.balance.toFixed(2);
    
    const homaTodayElem = document.getElementById('homa-today');
    if (homaTodayElem) homaTodayElem.textContent = userData.homaToday.toFixed(4);
    
    const homaTotalElem = document.getElementById('homa-total');
    if (homaTotalElem) homaTotalElem.textContent = userData.homaTotal.toFixed(4);
    
    const homaProgress = document.getElementById('homa-progress');
    if (homaProgress) {
        const percent = (userData.homaToday / 10) * 100;
        homaProgress.style.width = Math.min(percent, 100) + '%';
    }
    
    const homaProgressText = document.getElementById('homa-progress-text');
    if (homaProgressText) {
        const percent = Math.min((userData.homaToday / 10) * 100, 100).toFixed(1);
        homaProgressText.textContent = percent + '% от лимита';
    }
    
    const homaMaxBtn = document.getElementById('homa-max-btn');
    if (homaMaxBtn) {
        if (userData.homaToday >= 10) {
            homaMaxBtn.disabled = true;
            homaMaxBtn.textContent = 'Достигнут лимит на сегодня';
        } else {
            homaMaxBtn.disabled = false;
            homaMaxBtn.textContent = 'Кликай по Хоме!';
        }
    }
}

function updateProfileStats() {
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => !t.completed && new Date(t.deadline) < new Date()).length;
    const total = tasks.length;
    
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-overdue').textContent = overdue;
    document.getElementById('stat-total').textContent = total;
    
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById('completion-rate').textContent = rate + '%';
    document.getElementById('progress-fill').style.width = rate + '%';
    
    const joinDate = localStorage.getItem('joinDate') || new Date().toISOString();
    localStorage.setItem('joinDate', joinDate);
    document.getElementById('join-date').textContent = new Date(joinDate).toLocaleDateString('ru-RU');
}

function checkHomaReset() {
    const today = new Date().toDateString();
    if (userData.lastHomaReset !== today) {
        userData.homaToday = 0;
        userData.lastHomaReset = today;
        saveData();
    }
}

function checkVacation() {
    if (vacationEnd && vacationEnd > new Date()) {
        const now = new Date();
        const diff = vacationEnd - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        document.getElementById('vacation-status').textContent = 
            `Выходной активен: ${hours}ч ${minutes}м`;
    } else {
        document.getElementById('vacation-status').textContent = 'Нет активного выходного';
    }
}

function showWelcomeScreen() {
    const randomIndex = Math.floor(Math.random() * motivationPhrases.length);
    document.getElementById('motivation-text').textContent = motivationPhrases[randomIndex];
    
    setTimeout(() => {
        document.getElementById('loading-dots').classList.add('hidden');
        document.getElementById('start-btn').classList.remove('hidden');
    }, 2000);
}

function setupEventListeners() {
    document.getElementById('start-btn').addEventListener('click', function() {
        document.getElementById('welcome-screen').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
    });
    
    document.getElementById('add-task-btn').addEventListener('click', function() {
        document.getElementById('task-modal').classList.add('active');
        updateReward();
    });
    
    document.getElementById('shop-btn').addEventListener('click', function() {
        document.getElementById('shop-modal').classList.add('active');
        checkVacation();
    });
    
    document.getElementById('homa-btn').addEventListener('click', function() {
        document.getElementById('homa-modal').classList.add('active');
        updateUserInfo();
    });
    
    document.getElementById('refresh-btn').addEventListener('click', function() {
        renderTasks();
        showNotification('Данные обновлены!', 'success');
    });
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeAllModals();
        });
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const section = this.dataset.section;
            if (section === 'profile') {
                document.getElementById('profile-modal').classList.add('active');
                updateProfileStats();
            } else if (section === 'shop') {
                document.getElementById('shop-modal').classList.add('active');
                checkVacation();
            } else {
                closeAllModals();
            }
        });
    });
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDifficulty = this.dataset.level;
            updateReward();
        });
    });
    
    document.getElementById('task-days').addEventListener('input', updateReward);
    document.getElementById('task-hours').addEventListener('input', updateReward);
    document.getElementById('task-minutes').addEventListener('input', updateReward);
    
    document.getElementById('save-task-btn').addEventListener('click', saveNewTask);
    
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const hours = parseInt(this.dataset.hours);
            const price = parseInt(this.dataset.price);
            buyVacation(hours, price);
        });
    });
    
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    });
    
    document.getElementById('notifications-toggle').addEventListener('change', function() {
        showNotification('Уведомления ' + (this.checked ? 'включены' : 'отключены'), 'info');
    });
    
    const homaImage = document.getElementById('homa-image');
    if (homaImage) {
        homaImage.addEventListener('click', homaClick);
    }
}

function updateReward() {
    const days = parseInt(document.getElementById('task-days').value) || 0;
    const hours = parseInt(document.getElementById('task-hours').value) || 0;
    const minutes = parseInt(document.getElementById('task-minutes').value) || 1;
    
    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
    const baseReward = totalMinutes * 0.01;
    const multiplier = difficultyMultipliers[currentDifficulty];
    const totalReward = baseReward * multiplier;
    
    document.getElementById('base-reward').textContent = baseReward.toFixed(2);
    document.getElementById('difficulty-bonus-text').textContent = '+' + ((multiplier - 1) * 100) + '%';
    document.getElementById('total-reward').textContent = totalReward.toFixed(2);
}

function getTotalMinutes() {
    const days = parseInt(document.getElementById('task-days').value) || 0;
    const hours = parseInt(document.getElementById('task-hours').value) || 0;
    const minutes = parseInt(document.getElementById('task-minutes').value) || 1;
    return (days * 24 * 60) + (hours * 60) + minutes;
}

function getReminderMinutes() {
    const days = parseInt(document.getElementById('reminder-days').value) || 0;
    const hours = parseInt(document.getElementById('reminder-hours').value) || 0;
    const minutes = parseInt(document.getElementById('reminder-minutes').value) || 5;
    return (days * 24 * 60) + (hours * 60) + minutes;
}

function saveNewTask() {
    console.log("Пытаемся сохранить задачу...");
    
    // Получаем элементы
    const titleInput = document.getElementById('task-title');
    const daysInput = document.getElementById('task-days');
    const hoursInput = document.getElementById('task-hours');
    const minutesInput = document.getElementById('task-minutes');
    const reminderDaysInput = document.getElementById('reminder-days');
    const reminderHoursInput = document.getElementById('reminder-hours');
    const reminderMinutesInput = document.getElementById('reminder-minutes');
    
    // Проверяем что элементы существуют
    if (!titleInput) {
        console.error("Поле названия не найдено!");
        showNotification('Ошибка: поле названия не найдено', 'error');
        return;
    }
    
    // Получаем значения
    const title = titleInput.value.trim();
    console.log("Название задачи:", title);
    
    const days = parseInt(daysInput.value) || 0;
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 1;
    
    const reminderDays = parseInt(reminderDaysInput.value) || 0;
    const reminderHours = parseInt(reminderHoursInput.value) || 0;
    const reminderMinutes = parseInt(reminderMinutesInput.value) || 5;
    
    // Валидация
    if (!title) {
        showNotification('Введите название задачи!', 'error');
        titleInput.style.borderColor = '#f44336';
        titleInput.focus();
        return;
    }
    
    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
    const reminderTotalMinutes = (reminderDays * 24 * 60) + (reminderHours * 60) + reminderMinutes;
    
    if (totalMinutes < 1 || totalMinutes > 43200) {
        showNotification('Введите время от 1 минуты до 30 дней!', 'error');
        return;
    }
    
    if (reminderTotalMinutes >= totalMinutes) {
        showNotification('Напоминание должно быть раньше дедлайна!', 'error');
        return;
    }
    
    // Создаем задачу
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
        reminder: reminderTotalMinutes,
        difficulty: currentDifficulty,
        reward: reward,
        completed: false,
        createdAt: now.toISOString(),
        totalMinutes: totalMinutes
    };
    
    console.log("Новая задача:", newTask);
    
    // Добавляем в список
    tasks.push(newTask);
    saveData();
    renderTasks();
    closeAllModals();
    showNotification('Задача добавлена!', 'success');
    
    // Очищаем форму
    titleInput.value = '';
    titleInput.style.borderColor = '#e0e0e0';
    daysInput.value = '0';
    hoursInput.value = '0';
    minutesInput.value = '30';
    reminderDaysInput.value = '0';
    reminderHoursInput.value = '0';
    reminderMinutesInput.value = '5';
    
    // Отправляем в бота
    sendToBot('new_task', { task: newTask });
}

// Функция для проверки работы полей ввода
window.checkInputs = function() {
    const title = document.getElementById('task-title');
    if (title) {
        console.log("Поле названия найдено");
        title.style.border = '3px solid green';
        title.focus();
    } else {
        console.error("Поле названия НЕ найдено!");
    }
    
    // Проверяем все поля
    const inputs = document.querySelectorAll('input');
    console.log("Найдено полей ввода:", inputs.length);
    inputs.forEach((input, index) => {
        console.log(`Поле ${index}:`, input.id, input.type);
    });
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const now = new Date();
    
    let activeTasks = tasks.filter(t => !t.completed);
    
    if (vacationEnd && vacationEnd > now) {
        activeTasks = activeTasks.filter(t => new Date(t.deadline) > vacationEnd);
    }
    
    if (activeTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>У вас еще нет задач</p>
            </div>
        `;
        return;
    }
    
    activeTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    let html = '';
    activeTasks.forEach((task, index) => {
        const timeLeft = getTimeLeft(task.deadline);
        const deadline = new Date(task.deadline);
        const created = new Date(task.createdAt);
        const timePassed = (now - created) / (1000 * 60);
        
        let canDelete = timePassed > 60 && task.totalMinutes > 60;
        
        html += `
            <div class="task-item" data-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">${index + 1}. ${task.title}</div>
                    <div class="task-deadline">${timeLeft}</div>
                </div>
                <div class="task-difficulty">
                    <i class="fas fa-chart-line"></i>
                    Сложность: ${getDifficultyText(task.difficulty)}
                </div>
                <div class="task-actions">
                    <div class="task-reward">
                        <i class="fas fa-coins"></i>
                        ${task.reward.toFixed(2)} монет
                    </div>
                    <div>
                        <button class="complete-btn" onclick="completeTask('${task.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        ${canDelete ? `<button class="delete-btn" onclick="deleteTask('${task.id}')">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getTimeLeft(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff < 0) return 'Просрочено';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return days + 'д ' + hours + 'ч';
    } else if (hours > 0) {
        return hours + 'ч ' + minutes + 'м';
    } else {
        return minutes + 'м';
    }
}

function getDifficultyText(level) {
    const texts = { 'easy': 'Легкая', 'medium': 'Средняя', 'hard': 'Сложная' };
    return texts[level] || level;
}

window.completeTask = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const now = new Date();
    const created = new Date(task.createdAt);
    const timePassed = (now - created) / (1000 * 60);
    
    const minTime = task.totalMinutes * 0.1;
    
    if (timePassed < minTime) {
        const remaining = Math.ceil(minTime - timePassed);
        showNotification(`Подождите еще ${remaining} минут!`, 'error');
        return;
    }
    
    task.completed = true;
    task.completedAt = now.toISOString();
    
    const deadline = new Date(task.deadline);
    let reward = task.reward;
    
    if (now < deadline) {
        const early = (deadline - now) / (1000 * 60 * 60);
        if (early > task.totalMinutes * 0.5) {
            reward *= 2;
        }
    }
    
    userData.balance += reward;
    saveData();
    renderTasks();
    updateUserInfo();
    showNotification('Задача выполнена! +' + reward.toFixed(2) + ' монет', 'success');
    
    sendToBot('task_completed', { taskId: taskId, reward: reward });
};

window.deleteTask = function(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const now = new Date();
    const created = new Date(task.createdAt);
    const timePassed = (now - created) / (1000 * 60);
    
    if (timePassed > 60 && task.totalMinutes > 60) {
        if (confirm('Удалить задачу? Будет списано 2 монеты!')) {
            if (userData.balance >= 2) {
                userData.balance -= 2;
                tasks = tasks.filter(t => t.id !== taskId);
                saveData();
                renderTasks();
                updateUserInfo();
                showNotification('Задача удалена. Списано 2 монеты', 'info');
                
                sendToBot('task_deleted', { taskId: taskId, penalty: 2 });
            } else {
                showNotification('Недостаточно монет для штрафа!', 'error');
            }
        }
    }
};

function homaClick() {
    if (userData.homaToday >= 10) {
        showNotification('Лимит на сегодня исчерпан!', 'error');
        return;
    }
    
    const reward = 0.0001;
    userData.homaToday += reward;
    userData.homaTotal += reward;
    userData.balance += reward;
    
    saveData();
    updateUserInfo();
    
    const effect = document.getElementById('homa-effect');
    effect.classList.add('show');
    setTimeout(() => {
        effect.classList.remove('show');
    }, 1000);
    
    const image = document.getElementById('homa-image');
    image.style.transform = 'scale(0.95)';
    setTimeout(() => {
        image.style.transform = 'scale(1)';
    }, 100);
}

function buyVacation(hours, price) {
    if (userData.balance < price) {
        showNotification('Недостаточно монет!', 'error');
        return;
    }
    
    if (confirm(`Купить выходной на ${hours} часов за ${price} монет?`)) {
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
        updateUserInfo();
        closeAllModals();
        showNotification(`Выходной на ${hours} часов активирован!`, 'success');
        
        sendToBot('vacation_bought', { hours: hours, price: price });
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function showNotification(text, type) {
    const notification = document.getElementById('notification');
    const textEl = document.getElementById('notification-text');
    
    textEl.textContent = text;
    notification.classList.remove('hidden');
    
    if (type === 'error') {
        notification.style.background = '#f44336';
    } else if (type === 'success') {
        notification.style.background = '#4CAF50';
    } else {
        notification.style.background = '#2196F3';
    }
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function sendToBot(event, data) {
    if (tg && tg.sendData) {
        const message = {
            type: event,
            ...data
        };
        tg.sendData(JSON.stringify(message));
        console.log('Отправлено в бота:', message);
    } else {
        console.log('Тестовый режим (бот не подключен)');
    }
}

window.addTestTasks = function() {
    const now = new Date();
    const test = [
        {
            id: '1',
            title: 'Прочитать книгу',
            deadline: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
            difficulty: 'medium',
            reward: 1.2,
            completed: false,
            createdAt: now.toISOString(),
            totalMinutes: 120
        },
        {
            id: '2',
            title: 'Сделать зарядку',
            deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            difficulty: 'easy',
            reward: 0.6,
            completed: false,
            createdAt: now.toISOString(),
            totalMinutes: 1440
        }
    ];
    
    tasks = [...tasks, ...test];
    saveData();
    renderTasks();
    showNotification('Тестовые задачи добавлены!', 'success');
};