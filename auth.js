(function() {
    // ===== КОНФИГ =====
    const SUPABASE_URL = 'https://vgbvtxzwziserskjqcms.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnZ0eHp3emlzZXJza2pxY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgwNjcsImV4cCI6MjA5MDk5NDA2N30.CbTvOA3HoqoId1DKDFX3hIAfdIhSiJoQEnokshvpnnA';
    
    let supabaseClient = null;
    
    // DOM элементы
    let authBtn, authModal, closeModalBtn, loginContainer, signupContainer, loginForm, signupForm;
    let loginUsername, loginPassword, signupUsername, signupEmail, signupPassword, signupPasswordConfirm;
    let authMessage, userPanel, userNameDisplay, logoutBtn, userAvatar;
    let switchToSignup, switchToLogin;
    
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
            if (loginForm) loginForm.reset();
            if (signupForm) signupForm.reset();
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
            if (loginContainer) loginContainer.hidden = false;
            if (signupContainer) signupContainer.hidden = true;
            if (loginUsername) loginUsername.focus();
        }
    }
    
    // Получение username из таблицы profiles по user.id
    async function fetchUsername(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return data?.username || null;
        } catch (err) {
            console.warn('Не удалось получить username из profiles:', err);
            return null;
        }
    }
    
    async function updateUI(user) {
        if (user) {
            // Пытаемся получить username из profiles (там хранится кастомный логин)
            let username = user.user_metadata?.username;
            if (!username) {
                const fetched = await fetchUsername(user.id);
                if (fetched) username = fetched;
            }
            if (!username) username = user.email?.split('@')[0] || 'Гость';
            
            // Обновляем кнопку: показываем аватар-кружок и имя
            if (authBtn) {
                // Очищаем содержимое кнопки
                authBtn.innerHTML = '';
                // Создаём кружок с первой буквой
                const avatarSpan = document.createElement('span');
                avatarSpan.className = 'user-avatar-circle';
                avatarSpan.textContent = username.charAt(0).toUpperCase();
                // Создаём текст с именем
                const nameSpan = document.createElement('span');
                nameSpan.className = 'user-name-text';
                nameSpan.textContent = username;
                authBtn.appendChild(avatarSpan);
                authBtn.appendChild(nameSpan);
                authBtn.classList.add('logged-in');
            }
            if (userPanel) userPanel.hidden = false;
            if (userNameDisplay) userNameDisplay.textContent = username;
            if (loginContainer) loginContainer.hidden = true;
            if (signupContainer) signupContainer.hidden = true;
            localStorage.setItem('chat_user', JSON.stringify({ id: user.id, username }));
        } else {
            if (authBtn) {
                authBtn.innerHTML = 'Войти';
                authBtn.classList.remove('logged-in');
            }
            if (userPanel) userPanel.hidden = true;
            if (loginContainer) loginContainer.hidden = false;
            if (signupContainer) signupContainer.hidden = true;
            localStorage.removeItem('chat_user');
        }
    }
    
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
            // Регистрация через Supabase auth (триггер сам создаст профиль)
            const { data, error } = await supabaseClient.auth.signUp({
                email, password,
                options: { data: { username } } // username попадёт в raw_user_meta_data, а триггер создаст профиль
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
    
    async function handleLogin(e) {
        e.preventDefault();
        hideMessage();
        const loginValue = loginUsername.value.trim();
        const password = loginPassword.value;
        if (!loginValue || !password) return showMessage('Заполните оба поля', 'error');
        const email = loginValue.includes('@') ? loginValue : `${loginValue}@chat.placeholder`;
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showMessage('✅ Добро пожаловать!', 'success');
            loginForm.reset();
            closeModal(); // закрываем модалку после успешного входа
        } catch (err) {
            let msg = err.message;
            if (msg.includes('Invalid login credentials')) msg = 'Неверный логин или пароль';
            showMessage('❌ ' + msg, 'error');
        }
    }
    
    async function handleLogout() {
        await supabaseClient.auth.signOut();
        closeModal();
    }
    
    async function initSupabase() {
        if (!window.supabase) {
            console.error('❌ Библиотека Supabase не загружена');
            return false;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase клиент создан');
        const { data: { session } } = await supabaseClient.auth.getSession();
        await updateUI(session?.user || null);
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            await updateUI(session?.user || null);
            if (event === 'SIGNED_IN') closeModal();
        });
        return true;
    }
    
    document.addEventListener('DOMContentLoaded', async () => {
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
            console.error('❌ Кнопка или модальное окно не найдены');
            return;
        }
        
        await initSupabase();
        
        // Открытие модалки
        authBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔘 Нажата кнопка Войти');
            openModal();
        });
        
        // Закрытие ТОЛЬКО по крестику (убираем клик по фону и Escape)
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        // Больше никаких обработчиков закрытия по фону и Escape
        
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
        
        console.log('✅ auth.js полностью загружен, обработчики навешаны');
    });
})();
