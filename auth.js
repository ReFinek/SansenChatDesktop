// ===== КОНФИГУРАЦИЯ SUPABASE =====
const SUPABASE_URL = 'https://vgbvtxzwziserskjqcms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnZ0eHp3emlzZXJza2pxY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgwNjcsImV4cCI6MjA5MDk5NDA2N30.CbTvOA3HoqoId1DKDFX3hIAfdIhSiJoQEnokshvpnnA';

// Инициализация клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase клиент создан');

// Элементы DOM (заполнятся после загрузки)
let authBtn, authModal, closeModal, loginForm, signupForm, tabBtns, authMessage, userPanel, userNameDisplay, logoutBtn;

// Вспомогательные функции
function showMessage(text, type) {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = `auth-message show ${type}`;
    console.log(`💬 [${type}] ${text}`);
}

function hideMessage() {
    if (authMessage) authMessage.className = 'auth-message';
}

function closeModalHandler() {
    if (authModal) {
        authModal.hidden = true;
        authModal.style.display = 'none';
    }
    document.body.style.overflow = '';
    hideMessage();
    // Сброс форм и активной вкладки
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
    if (loginTab) loginTab.click();
    console.log('❌ Модальное окно закрыто');
}

// Обновление UI в зависимости от пользователя
async function updateUI(user) {
    const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Гость';
    
    if (user) {
        // Авторизован
        if (authBtn) {
            authBtn.textContent = username;
            authBtn.classList.add('logged-in');
        }
        if (userPanel) userPanel.hidden = false;
        if (userNameDisplay) userNameDisplay.textContent = username;
        if (loginForm) loginForm.hidden = true;
        if (signupForm) signupForm.hidden = true;
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.hidden = true;
        
        // Сохраняем в localStorage для быстрого доступа (дублируем)
        localStorage.setItem('chat_user', JSON.stringify({
            id: user.id,
            username: username,
            avatar: user.user_metadata?.avatar_url
        }));
        console.log('👤 UI обновлён: пользователь', username);
    } else {
        // Не авторизован
        if (authBtn) {
            authBtn.textContent = 'Войти';
            authBtn.classList.remove('logged-in');
        }
        if (userPanel) userPanel.hidden = true;
        if (loginForm) loginForm.hidden = false;
        if (signupForm) signupForm.hidden = true;
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.hidden = false;
        
        localStorage.removeItem('chat_user');
        console.log('👤 UI обновлён: не авторизован');
    }
}

// Проверка текущей сессии при загрузке
async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        await updateUI(session?.user || null);
        console.log('🔍 Сессия при загрузке:', session ? 'активна' : 'отсутствует');
    } catch (err) {
        console.error('❌ Ошибка проверки сессии:', err);
        await updateUI(null);
    }
}

// Обработчик изменения состояния авторизации (привязываем один раз)
function initAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 onAuthStateChange:', event, session?.user?.email);
        await updateUI(session?.user || null);
        
        // Автоматически закрываем модалку при успешном входе/регистрации
        if (event === 'SIGNED_IN' || event === 'SIGNED_UP') {
            closeModalHandler();
            showMessage('✅ Добро пожаловать!', 'success');
        }
        if (event === 'SIGNED_OUT') {
            showMessage('✅ Вы вышли из аккаунта', 'success');
        }
    });
}

// Регистрация
async function handleSignup(e) {
    e.preventDefault();
    hideMessage();
    
    const username = document.getElementById('signupUsername').value.trim();
    const emailRaw = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (username.length < 3) {
        showMessage('Логин должен содержать минимум 3 символа', 'error');
        return;
    }
    if (password.length < 6) {
        showMessage('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    // Если email не указан, генерируем псевдо-email
    const email = emailRaw || `${username}@chat.placeholder`;
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { username: username }
            }
        });
        
        if (error) throw error;
        
        console.log('✅ Регистрация успешна:', data.user);
        showMessage('✅ Регистрация успешна! Теперь войдите.', 'success');
        document.getElementById('signupForm').reset();
        
        // Переключаем на вкладку "Вход"
        const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
        if (loginTab) loginTab.click();
        
        // Автоматически заполняем логин (если email был указан, то им, иначе логином)
        const loginInput = document.getElementById('loginUsername');
        if (loginInput) loginInput.value = emailRaw || username;
        
    } catch (err) {
        console.error('❌ Ошибка регистрации:', err);
        let msg = err.message;
        if (msg.includes('User already registered')) msg = 'Пользователь с таким email уже существует';
        if (msg.includes('Password should be at least 6 characters')) msg = 'Пароль минимум 6 символов';
        showMessage('❌ ' + msg, 'error');
    }
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    hideMessage();
    
    const loginInput = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!loginInput || !password) {
        showMessage('Заполните оба поля', 'error');
        return;
    }
    
    // Определяем, email это или логин
    const email = loginInput.includes('@') ? loginInput : `${loginInput}@chat.placeholder`;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ Вход выполнен:', data.user);
        showMessage('✅ Добро пожаловать!', 'success');
        document.getElementById('loginForm').reset();
        // Модалка закроется автоматически через onAuthStateChange
        
    } catch (err) {
        console.error('❌ Ошибка входа:', err);
        let msg = err.message;
        if (msg.includes('Invalid login credentials')) msg = 'Неверный логин или пароль';
        if (msg.includes('Email not confirmed')) msg = 'Подтвердите email (проверьте почту)';
        showMessage('❌ ' + msg, 'error');
    }
}

// Выход
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        console.log('✅ Выход выполнен');
        closeModalHandler();
    } catch (err) {
        console.error('❌ Ошибка выхода:', err);
        showMessage('❌ Ошибка выхода', 'error');
    }
}

// Настройка обработчиков после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализация auth...');
    
    // Получаем элементы
    authBtn = document.getElementById('authBtn');
    authModal = document.getElementById('authModal');
    closeModal = document.getElementById('closeModal');
    loginForm = document.getElementById('loginForm');
    signupForm = document.getElementById('signupForm');
    tabBtns = document.querySelectorAll('.tab-btn');
    authMessage = document.getElementById('authMessage');
    userPanel = document.getElementById('userPanel');
    userNameDisplay = document.getElementById('userNameDisplay');
    logoutBtn = document.getElementById('logoutBtn');
    
    if (!authBtn || !authModal) {
        console.error('❌ Критические элементы не найдены! Проверьте HTML.');
        return;
    }
    
    // 1. Проверка сессии
    checkSession();
    
    // 2. Слушатель изменений авторизации
    initAuthListener();
    
    // 3. Открытие модального окна
    authBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🔘 Клик по кнопке "Войти"');
        authModal.hidden = false;
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        hideMessage();
        // Сбрасываем активную вкладку на "Вход"
        const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
        if (loginTab) loginTab.click();
    });
    
    // 4. Закрытие модалки
    if (closeModal) {
        closeModal.addEventListener('click', closeModalHandler);
    }
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeModalHandler();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal && !authModal.hidden) closeModalHandler();
    });
    
    // 5. Переключение вкладок
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const isLogin = btn.dataset.tab === 'login';
            if (loginForm) loginForm.hidden = !isLogin;
            if (signupForm) signupForm.hidden = isLogin;
            hideMessage();
        });
    });
    
    // 6. Отправка форм
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    console.log('✅ Все обработчики событий установлены');
});
