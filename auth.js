// ===== КОНФИГ =====
const SUPABASE_URL = 'https://vgbvtxzwziserskjqcms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnZ0eHp3emlzZXJza2pxY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgwNjcsImV4cCI6MjA5MDk5NDA2N30.CbTvOA3HoqoId1DKDFX3hIAfdIhSiJoQEnokshvpnnA';

// Глобальные переменные
let supabase;
let authBtn, authModal, closeModal, loginForm, signupForm, tabBtns, authMessage, userPanel, userNameDisplay, logoutBtn;

// Функции для UI
function showMessage(text, type) {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = `auth-message show ${type}`;
}

function hideMessage() {
    if (authMessage) authMessage.className = 'auth-message';
}

function closeModal() {
    if (authModal) {
        authModal.hidden = true;
        authModal.style.display = 'none';
        document.body.style.overflow = '';
        hideMessage();
        // Сброс форм
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
    }
}

function openModal() {
    if (authModal) {
        authModal.hidden = false;
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        hideMessage();
        // Устанавливаем активную вкладку "Вход"
        const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
        if (loginTab) loginTab.click();
    }
}

async function updateUI(user) {
    const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Гость';
    if (user) {
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
        localStorage.setItem('chat_user', JSON.stringify({ id: user.id, username }));
    } else {
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
    }
}

// Регистрация
async function handleSignup(e) {
    e.preventDefault();
    hideMessage();
    const username = document.getElementById('signupUsername').value.trim();
    const emailRaw = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (username.length < 3) return showMessage('Логин минимум 3 символа', 'error');
    if (password.length < 6) return showMessage('Пароль минимум 6 символов', 'error');
    const email = emailRaw || `${username}@chat.placeholder`;
    try {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { username } }
        });
        if (error) throw error;
        showMessage('✅ Регистрация успешна! Теперь войдите.', 'success');
        document.getElementById('signupForm').reset();
        const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
        if (loginTab) loginTab.click();
        const loginInput = document.getElementById('loginUsername');
        if (loginInput) loginInput.value = emailRaw || username;
    } catch (err) {
        let msg = err.message;
        if (msg.includes('User already registered')) msg = 'Пользователь уже существует';
        showMessage('❌ ' + msg, 'error');
    }
}

// Вход
async function handleLogin(e) {
    e.preventDefault();
    hideMessage();
    const loginInput = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!loginInput || !password) return showMessage('Заполните оба поля', 'error');
    const email = loginInput.includes('@') ? loginInput : `${loginInput}@chat.placeholder`;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showMessage('✅ Добро пожаловать!', 'success');
        document.getElementById('loginForm').reset();
        closeModal(); // закрываем модалку после входа
    } catch (err) {
        let msg = err.message;
        if (msg.includes('Invalid login credentials')) msg = 'Неверный логин или пароль';
        showMessage('❌ ' + msg, 'error');
    }
}

// Выход
async function handleLogout() {
    await supabase.auth.signOut();
    closeModal();
}

// Проверка сессии и подписка на изменения
async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    await updateUI(session?.user || null);
    supabase.auth.onAuthStateChange(async (event, session) => {
        await updateUI(session?.user || null);
        if (event === 'SIGNED_IN') closeModal();
    });
}

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Supabase
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase инициализирован');
        initAuth();
    } else {
        console.error('❌ Supabase не загружен! Проверь подключение библиотеки.');
    }

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
        console.error('❌ Кнопка или модалка не найдены!');
        return;
    }

    // Открытие
    authBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🔘 Кнопка нажата, открываем модалку');
        openModal();
    });

    // Закрытие
    if (closeModal) closeModal.addEventListener('click', closeModal);
    if (authModal) authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && authModal && !authModal.hidden) closeModal(); });

    // Вкладки
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

    // Формы
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    console.log('✅ Обработчики навешаны');
});
