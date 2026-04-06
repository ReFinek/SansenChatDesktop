console.log('%c🚀 [AUTH.JS] Скрипт загружен', 'color: #00ff00; font-weight: bold; background: #222; padding: 4px 8px; border-radius: 4px;');

// ===== НАСТРОЙКИ SUPABASE =====
const SUPABASE_URL = 'https://vgbvtxzwziserskjqcms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnZ0eHp3emlzZXJza2pxY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgwNjcsImV4cCI6MjA5MDk5NDA2N30.CbTvOA3HoqoId1DKDFX3hIAfdIhSiJoQEnokshvpnnA';

let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ [AUTH.JS] Supabase клиент инициализирован');
} catch (err) {
    console.error('❌ [AUTH.JS] Ошибка инициализации Supabase:', err);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 [AUTH.JS] DOMContentLoaded сработал');

    // 1. Поиск элементов
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

    console.log('🔍 [AUTH.JS] Поиск DOM-элементов:', {
        authBtn: !!authBtn,
        authModal: !!authModal,
        closeModal: !!closeModal,
        loginForm: !!loginForm,
        signupForm: !!signupForm,
        tabBtns: tabBtns.length
    });

    if (!authBtn || !authModal) {
        console.error('❌ [AUTH.JS] FATAL: Кнопка или модальное окно не найдены! Проверь HTML.');
        return;
    }

    console.log('✅ [AUTH.JS] Все критические элементы найдены');

    // 2. Проверка сессии при загрузке
    checkSession();

    // 3. Логика модального окна (с максимальной отладкой)
    authBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🔘 [AUTH.JS] КЛИК по кнопке "Войти"');
        console.log('📦 [AUTH.JS] authModal до открытия:', authModal);
        console.log('👀 [AUTH.JS] authModal.hidden:', authModal.hidden);
        console.log('🎨 [AUTH.JS] authModal.style.display:', window.getComputedStyle(authModal).display);

        authModal.hidden = false;
        authModal.style.display = 'flex'; // Принудительно на случай CSS-конфликтов
        document.body.style.overflow = 'hidden';
        
        console.log('🔓 [AUTH.JS] Модальное окно должно быть открыто. Проверь визуально и консоль.');
    });

    if (closeModal) {
        closeModal.addEventListener('click', () => closeModalHandler());
    }

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                console.log('👆 [AUTH.JS] Клик по фону -> закрытие');
                closeModalHandler();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal && !authModal.hidden) {
            console.log('⌨️ [AUTH.JS] Escape -> закрытие');
            closeModalHandler();
        }
    });

    function closeModalHandler() {
        if (authModal) {
            authModal.hidden = true;
            authModal.style.display = 'none';
        }
        document.body.style.overflow = '';
        hideMessage();
        console.log('❌ [AUTH.JS] Модальное окно закрыто');
    }

    // 4. Переключение вкладок
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.tab === 'login') {
                loginForm.hidden = false;
                signupForm.hidden = true;
                console.log('🔄 [AUTH.JS] Вкладка: Вход');
            } else {
                loginForm.hidden = true;
                signupForm.hidden = false;
                console.log('🔄 [AUTH.JS] Вкладка: Регистрация');
            }
            hideMessage();
        });
    });

    // 5. Форма регистрации
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📝 [AUTH.JS] Отправка формы регистрации...');
            hideMessage();
            
            const username = document.getElementById('signupUsername').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            
            console.log('📤 [AUTH.JS] Данные:', { username, email: email ? 'указан' : 'авто', passwordLength: password.length });

            if (password.length < 6) {
                showMessage('Пароль должен содержать минимум 6 символов', 'error');
                console.warn('⚠️ [AUTH.JS] Пароль слишком короткий');
                return;
            }
            if (username.length < 3) {
                showMessage('Логин должен содержать минимум 3 символа', 'error');
                return;
            }

            try {
                const finalEmail = email || `${username}@chat.placeholder`;
                console.log('🌐 [AUTH.JS] Запрос к Supabase signUp...');
                
                const {  { session }, error } = await supabase.auth.signUp({
                    email: finalEmail,
                    password: password,
                    options: { data: { username } }
                });

                if (error) throw error;
                
                console.log('✅ [AUTH.JS] Регистрация успешна:', session ? 'с сессией' : 'требует подтверждения');
                showMessage('✅ Регистрация успешна! Проверьте почту или войдите.', 'success');
                signupForm.reset();
                
                setTimeout(() => {
                    if (tabBtns[0]) tabBtns[0].click();
                }, 1500);
            } catch (err) {
                console.error('❌ [AUTH.JS] Ошибка регистрации:', err);
                showMessage('❌ ' + (err.message || 'Ошибка регистрации'), 'error');
            }
        });
    }

    // 6. Форма входа
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔑 [AUTH.JS] Отправка формы входа...');
            hideMessage();
            
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            console.log('📤 [AUTH.JS] Данные входа:', { username });

            try {
                const email = username.includes('@') ? username : `${username}@chat.placeholder`;
                console.log('🌐 [AUTH.JS] Запрос к Supabase signIn...');
                
                const {  { session }, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
                        throw new Error('Неверный логин или пароль');
                    }
                    throw error;
                }
                
                console.log('✅ [AUTH.JS] Вход успешен:', session?.user?.email || session?.user?.user_metadata?.username);
                showMessage('✅ Добро пожаловать!', 'success');
                loginForm.reset();
            } catch (err) {
                console.error('❌ [AUTH.JS] Ошибка входа:', err);
                showMessage('❌ ' + (err.message || 'Ошибка входа'), 'error');
            }
        });
    }

    // 7. Выход
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('🚪 [AUTH.JS] Запрос выхода...');
            try {
                await supabase.auth.signOut();
                console.log('✅ [AUTH.JS] Выход выполнен');
                showMessage('✅ Вы вышли из аккаунта', 'success');
                setTimeout(closeModalHandler, 1000);
            } catch (err) {
                console.error('❌ [AUTH.JS] Ошибка выхода:', err);
                showMessage('❌ Ошибка выхода', 'error');
            }
        });
    }
});

// ===== ПРОВЕРКА СЕССИИ =====
async function checkSession() {
    try {
        const {  { session } } = await supabase.auth.getSession();
        handleAuthState(session?.user ?? null);
        console.log('🔍 [AUTH.JS] Сессия при загрузке:', session ? 'активна' : 'нет');
    } catch (err) {
        console.error('❌ [AUTH.JS] Ошибка проверки сессии:', err);
    }
}

// Слушатель изменения состояния Auth
if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔄 [AUTH.JS] onAuthStateChange:', event, session?.user?.email || session?.user?.user_metadata?.username);
        handleAuthState(session?.user ?? null);
    });
}

// ===== ОБНОВЛЕНИЕ UI =====
function handleAuthState(user) {
    const authBtn = document.getElementById('authBtn');
    const userPanel = document.getElementById('userPanel');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const tabs = document.querySelector('.modal-tabs');

    if (user) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Пользователь';
        if (userNameDisplay) userNameDisplay.textContent = username;
        if (authBtn) {
            authBtn.textContent = username;
            authBtn.classList.add('logged-in');
        }
        if (userPanel) userPanel.hidden = false;
        if (loginForm) loginForm.hidden = true;
        if (signupForm) signupForm.hidden = true;
        if (tabs) tabs.hidden = true;
        console.log('👤 [AUTH.JS] UI обновлён: авторизован как', username);
    } else {
        if (authBtn) {
            authBtn.textContent = 'Войти';
            authBtn.classList.remove('logged-in');
        }
        if (userPanel) userPanel.hidden = true;
        if (loginForm) loginForm.hidden = false;
        if (tabs) tabs.hidden = false;
        console.log('👤 [AUTH.JS] UI обновлён: не авторизован');
    }

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

// ===== УТИЛИТЫ =====
function showMessage(text, type) {
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = text;
    el.className = `auth-message show ${type}`;
    console.log(`💬 [AUTH.JS] Сообщение: ${type} | ${text}`);
}

function hideMessage() {
    const el = document.getElementById('authMessage');
    if (el) el.className = 'auth-message';
}
