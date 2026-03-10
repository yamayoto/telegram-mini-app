const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let userData = {
    username: 'Пользователь',
    balance: 25,
    completedTasks: 0,
    activeTasks: 0,
    userId: null
};

let tasks = [];
let currentDifficulty = 'medium';

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
    loadTasks();
    setupEventListeners();
    showWelcomeScreen();
    updateUserInfo();
    renderTasks();
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

function loadTasks() {
    const saved = localStorage.getItem('tasks');
    if (saved) {
        tasks = JSON.parse(saved);
        updateTaskCounters();
    }
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateTaskCounters();
}

function updateTaskCounters() {
    userData.activeTasks = tasks.filter(t => !t.completed).length;
    userData.completedTasks = tasks.filter(t => t.completed).length;
    updateUserInfo();
    updateProfileStats();
}

function updateUserInfo() {
    document.getElementById('balance-value').textContent = userData.balance;
    document.getElementById('completed-value').textContent = userData.completedTasks;
    document.getElementById('active-value').textContent = userData.activeTasks;
    document.getElementById('shop-balance').textContent = userData.balance;
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
    });
    
    document.getElementById('shop-btn').addEventListener('click', function() {
        document.getElementById('shop-modal').classList.add('active');
    });
    
    document.getElementById('earn-btn').addEventListener('click', function() {
        showNotification('Мини-игры скоро появятся!', 'info');
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
    
    document.getElementById('task-deadline').addEventListener('input', updateReward);
    document.getElementById('save-task-btn').addEventListener('click', saveNewTask);
    
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.shop-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.dataset.tab + '-tab').classList.add('active');
        });
    });
    
    document.querySelectorAll('[data-item="dark_theme"]').forEach(btn => {
        btn.addEventListener('click', function() {
            if (userData.balance >= 30) {
                if (confirm('Купить тёмную тему за 30 монет?')) {
                    userData.balance -= 30;
                    document.body.classList.add('dark-theme');
                    saveUserData();
                    updateUserInfo();
                    showNotification('Тёмная тема куплена!', 'success');
                }
            } else {
                showNotification('Недостаточно монет!', 'error');
            }
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
}

function updateReward() {
    const hours = parseInt(document.getElementById('task-deadline').value) || 24;
    const base = hours * 0.1;
    const multiplier = difficultyMultipliers[currentDifficulty];
    const total = base * multiplier;
    
    document.getElementById('base-reward').textContent = base.toFixed(1);
    document.getElementById('difficulty-bonus-text').textContent = '+' + ((multiplier - 1) * 100) + '%';
    document.getElementById('total-reward').textContent = total.toFixed(1);
}

function saveNewTask() {
    const title = document.getElementById('task-title').value.trim();
    const hours = parseInt(document.getElementById('task-deadline').value);
    const reminder = document.querySelector('input[name="reminder"]:checked')?.value || 5;
    
    if (!title) {
        showNotification('Введите название задачи!', 'error');
        return;
    }
    
    if (hours < 1 || hours > 720) {
        showNotification('Введите время от 1 до 720 часов!', 'error');
        return;
    }
    
    const now = new Date();
    const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const reward = parseFloat(document.getElementById('total-reward').textContent);
    
    const newTask = {
        id: Date.now().toString(),
        title: title,
        deadline: deadline.toISOString(),
        reminder: parseInt(reminder),
        difficulty: currentDifficulty,
        reward: reward,
        completed: false,
        createdAt: now.toISOString()
    };
    
    tasks.push(newTask);
    saveTasks();
    renderTasks();
    closeAllModals();
    showNotification('Задача добавлена!', 'success');
    
    document.getElementById('task-title').value = '';
    document.getElementById('task-deadline').value = '24';
    
    sendToBot('new_task', { task: newTask });
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const activeTasks = tasks.filter(t => !t.completed);
    
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
                        ${task.reward.toFixed(1)} монет
                    </div>
                    <button class="complete-btn" onclick="completeTask('${task.id}')">
                        <i class="fas fa-check"></i> Выполнить
                    </button>
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
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
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
    
    task.completed = true;
    task.completedAt = new Date().toISOString();
    
    const now = new Date();
    const deadline = new Date(task.deadline);
    let reward = task.reward;
    
    if (now < deadline) {
        const early = (deadline - now) / (1000 * 60 * 60);
        if (early > task.deadlineHours * 0.5) {
            reward *= 2;
        }
    }
    
    userData.balance += reward;
    saveTasks();
    saveUserData();
    renderTasks();
    updateUserInfo();
    showNotification('Задача выполнена! +' + reward.toFixed(1) + ' монет', 'success');
    
    sendToBot('task_completed', { taskId: taskId, reward: reward });
};

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

function saveUserData() {
    localStorage.setItem('userBalance', userData.balance);
}

window.addTestTasks = function() {
    const test = [
        {
            id: '1',
            title: 'Прочитать книгу',
            deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            difficulty: 'medium',
            reward: 2.4,
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            title: 'Сделать зарядку',
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            difficulty: 'easy',
            reward: 1.2,
            completed: false,
            createdAt: new Date().toISOString()
        }
    ];
    
    tasks = [...tasks, ...test];
    saveTasks();
    renderTasks();
    showNotification('Тестовые задачи добавлены!', 'success');
};