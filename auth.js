// ===== КОНФИГУРАЦИЯ SUPABASE =====
const SUPABASE_URL = 'https://vgbvtxzwziserskjqcms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnZ0eHp3emlzZXJza2pxY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgwNjcsImV4cCI6MjA5MDk5NDA2N30.CbTvOA3HoqoId1DKDFX3hIAfdIhSiJoQEnokshvpnnA';

let supabase;
// DOM элементы
let authBtn, authModal, closeModalBtn, loginContainer, signupContainer, loginForm, signupForm;
let loginUsername, loginPassword, signupUsername, signupEmail, signupPassword, signupPasswordConfirm;
let authMessage, userPanel, userNameDisplay, logoutBtn;
let switchToSignup, switchToLogin;

// Вспомогательные функции
function showMessage(text, type) {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = `auth-message show ${type}`;
    setTimeout(() => {
        if (authMessage) authMessage.classList.remove('show');
    }, 4000);
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
        // Показываем форму входа по умолчанию
        if (loginContainer) loginContainer.hidden = false;
        if (signupContainer) signupContainer.hidden = true;
    }
}

function openModal() {
    if (authModal) {
        authModal.hidden = false;
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        hideMessage();
        // Всегда начинаем с формы входа
        if (loginContainer) loginContainer.hidden = false;
        if (signupContainer) signupContainer.hidden = true;
        if (loginUsername) loginUsername.focus();
    }
}

// Обновление UI в зависимости от пользователя
async function updateUI(user) {
    const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Гость';
    if (user) {
        if (authBtn) {
            authBtn.textContent = username;
            authBtn.classList.add('logged-in');
        }
        if (userPanel) userPanel.hidden = false;
        if (userNameDisplay) userNameDisplay.textContent = username;
        if (loginContainer) loginContainer.hidden = true;
        if (signupContainer) signupContainer.hidden = true;
        localStorage.setItem('chat_user', JSON.stringify({ id: user.id, username }));
    } else {
        if (authBtn) {
            authBtn.textContent = 'Войти';
            authBtn.classList.remove('logged-in');
        }
        if (userPanel) userPanel.hidden = true;
        if (loginContainer) loginContainer.hidden = false;
        if (signupContainer) signupContainer.hidden = true;
        localStorage.removeItem('chat_user');
    }
}

// Регистрация
async function handleSignup(e) {
    e.preventDefault();
    hideMessage();
    const username = signupUsername.value.trim();
    const emailRaw = signupEmail.value.trim();
    const password = signupPassword.value;
    const confirm = signupPasswordConfirm.value;
    
    if (username.length < 3) return showMessage('Логин минимум 3 символа', 'error');
    if (password.length < 6) return showMessage('Пароль минимум 6 символов', 'error');
    if (password !== confirm) return showMessage('Пароли не совпадают', 'error');
    
    const email = emailRaw || `${username}@chat.placeholder`;
    try {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { username } }
        });
        if (error) throw error;
        showMessage('✅ Регистрация успешна! Теперь войдите.', 'success');
        signupForm.reset();
        // Переключаем на форму входа
        if (loginContainer) loginContainer.hidden = false;
        if (signupContainer) signupContainer.hidden = true;
        if (loginUsername) loginUsername.value = emailRaw || username;
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
    const loginValue = loginUsername.value.trim();
    const password = loginPassword.value;
    if (!loginValue || !password) return showMessage('Заполните оба поля', 'error');
    const email = loginValue.includes('@') ? loginValue : `${loginValue}@chat.placeholder`;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showMessage('✅ Добро пожаловать!', 'success');
        loginForm.reset();
        closeModal();
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

// Инициализация Supabase и сессии
async function initAuth() {
    if (!window.supabase) {
        console.error('Supabase не загружен');
        return;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session } } = await supabase.auth.getSession();
    await updateUI(session?.user || null);
    supabase.auth.onAuthStateChange(async (event, session) => {
        await updateUI(session?.user || null);
        if (event === 'SIGNED_IN') closeModal();
    });
}

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы
    authBtn = document.getElementById('authBtn');
    authModal = document.getElementById('authModal');
    closeModalBtn = document.getElementById('closeModalBtn');
    loginContainer = document.getElementById('loginFormContainer');
    signupContainer = document.getElementById('signupFormContainer');
    loginForm = document.getElementById('loginForm');
    signupForm = document.getElementById('signupForm');
    loginUsername = document.getElementById('loginUsername');
    loginPassword = document.getElementById('loginPassword');
    signupUsername = document.getElementById('signupUsername');
    signupEmail = document.getElementById('signupEmail');
    signupPassword = document.getElementById('signupPassword');
    signupPasswordConfirm = document.getElementById('signupPasswordConfirm');
    authMessage = document.getElementById('authMessage');
    userPanel = document.getElementById('userPanel');
    userNameDisplay = document.getElementById('userNameDisplay');
    logoutBtn = document.getElementById('logoutBtn');
    switchToSignup = document.getElementById('switchToSignup');
    switchToLogin = document.getElementById('switchToLogin');
    
    if (!authBtn || !authModal) {
        console.error('Кнопка или модалка не найдены');
        return;
    }
    
    // Инициализация Supabase
    initAuth();
    
    // Открытие модалки
    authBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
    
    // Закрытие
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (authModal) authModal.addEventListener('click', (e) => { if (e.target === authModal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && authModal && !authModal.hidden) closeModal(); });
    
    // Переключение форм
    if (switchToSignup) {
        switchToSignup.addEventListener('click', () => {
            loginContainer.hidden = true;
            signupContainer.hidden = false;
            hideMessage();
            if (signupUsername) signupUsername.focus();
        });
    }
    if (switchToLogin) {
        switchToLogin.addEventListener('click', () => {
            loginContainer.hidden = false;
            signupContainer.hidden = true;
            hideMessage();
            if (loginUsername) loginUsername.focus();
        });
    }
    
    // Отправка форм
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    console.log('✅ auth.js загружен и настроен');
});
