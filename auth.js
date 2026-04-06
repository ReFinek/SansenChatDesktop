// ===== НАСТРОЙКИ SUPABASE =====
const SUPABASE_URL = 'https://vgbvtxzwziserskjqcms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnZ0eHp3emlzZXJza2pxY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgwNjcsImV4cCI6MjA5MDk5NDA2N30.CbTvOA3HoqoId1DKDFX3hIAfdIhSiJoQEnokshvpnnA';

// ===== ИНИЦИАЛИЗАЦИЯ SUPABASE (защита от повторного объявления) =====
const supabase = window.supabaseClient || 
    (window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));

// ===== DOM ЭЛЕМЕНТЫ =====
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeModal = document.getElementById('closeModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const authMessage = document.getElementById('authMessage');
const userPanel = document.getElementById('userPanel');
const userNameDisplay = document.getElementById('userNameDisplay');
const logoutBtn = document.getElementById('logoutBtn');

// ===== СОСТОЯНИЕ =====
let currentUser = null;

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async () => {
    // Проверка сохранённой сессии
    const {  { session } } = await supabase.auth.getSession();
    handleAuthState(session?.user ?? null);
    
    // Подписка на изменения авторизации
    supabase.auth.onAuthStateChange((event, session) => {
        handleAuthState(session?.user ?? null);
    });
});

// ===== ОБРАБОТКА СОСТОЯНИЯ АВТОРИЗАЦИИ =====
function handleAuthState(user) {
    currentUser = user;
    
    if (user) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Пользователь';
        userNameDisplay.textContent = username;
        authBtn.textContent = username;
        authBtn.classList.add('logged-in');
        userPanel.hidden = false;
        loginForm.hidden = true;
        signupForm.hidden = true;
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.hidden = true;
    } else {
        authBtn.textContent = 'Войти';
        authBtn.classList.remove('logged-in');
        userPanel.hidden = true;
        loginForm.hidden = false;
        const tabs = document.querySelector('.modal-tabs');
        if (tabs) tabs.hidden = false;
    }
    
    // Сохраняем в localStorage для быстрого доступа
    if (user) {
        localStorage.setItem('chat_user', JSON.stringify({
            id: user.id,
            username: user.user_metadata?.username || user.email,
            avatar: user.user_metadata?.avatar_url
        }));
    } else {
        localStorage.removeItem('chat_user');
    }
}

// ===== МОДАЛЬНОЕ ОКНО =====
if (authBtn) {
    authBtn.addEventListener('click', () => {
        authModal.hidden = false;
        document.body.style.overflow = 'hidden';
    });
}

if (closeModal) {
    closeModal.addEventListener('click', closeModalHandler);
}

if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeModalHandler();
    });
}

function closeModalHandler() {
    authModal.hidden = true;
    document.body.style.overflow = '';
    hideMessage();
}

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !authModal.hidden) {
        closeModalHandler();
    }
});

// ===== ВКЛАДКИ =====
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        if (btn.dataset.tab === 'login') {
            loginForm.hidden = false;
            signupForm.hidden = true;
        } else {
            loginForm.hidden = true;
            signupForm.hidden = false;
        }
        hideMessage();
    });
});

// ===== РЕГИСТРАЦИЯ =====
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage();
        
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        
        if (password.length < 6) {
            showMessage('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        if (username.length < 3) {
            showMessage('Логин должен содержать минимум 3 символа', 'error');
            return;
        }
        
        try {
            const finalEmail = email || `${username}@chat.placeholder`;
            
            const { data, error } = await supabase.auth.signUp({
                email: finalEmail,
                password: password,
                options: {
                    data: { username: username }
                }
            });
            
            if (error) throw error;
            
            showMessage('✅ Регистрация успешна! Теперь вы можете войти.', 'success');
            signupForm.reset();
            
            setTimeout(() => {
                tabBtns[0]?.click();
            }, 1500);
            
        } catch (err) {
            showMessage('❌ ' + (err.message || 'Ошибка регистрации'), 'error');
        }
    });
}

// ===== ВХОД =====
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessage();
        
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        try {
            const email = username.includes('@') ? username : `${username}@chat.placeholder`;
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                if (error.message.includes('Invalid login credentials') || 
                    error.message.includes('Email not confirmed')) {
                    throw new Error('Неверный логин или пароль');
                }
                throw error;
            }
            
            showMessage('✅ Добро пожаловать!', 'success');
            loginForm.reset();
            
        } catch (err) {
            showMessage('❌ ' + (err.message || 'Ошибка входа'), 'error');
        }
    });
}

// ===== ВЫХОД =====
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await supabase.auth.signOut();
            showMessage('✅ Вы вышли из аккаунта', 'success');
            setTimeout(closeModalHandler, 1000);
        } catch (err) {
            showMessage('❌ Ошибка выхода', 'error');
        }
    });
}

// ===== УТИЛИТЫ =====
function showMessage(text, type) {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = `auth-message show ${type}`;
}

function hideMessage() {
    if (!authMessage) return;
    authMessage.className = 'auth-message';
}
