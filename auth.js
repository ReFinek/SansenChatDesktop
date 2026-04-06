(function() {
    const SUPABASE_URL = 'https://vgbvtxzwziserskjqcms.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnZ0eHp3emlzZXJza2pxY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTgwNjcsImV4cCI6MjA5MDk5NDA2N30.CbTvOA3HoqoId1DKDFX3hIAfdIhSiJoQEnokshvpnnA';
    
    let supabaseClient = null;
    let currentUser = null;
    
    // DOM элементы
    let authBtn, authModal, closeModalBtn, loginContainer, signupContainer, loginForm, signupForm;
    let loginUsername, loginPassword, signupUsername, signupEmail, signupPassword, signupPasswordConfirm;
    let authMessage, userPanel, userNameDisplay, logoutBtn;
    let switchToSignup, switchToLogin;
    let avatarInput, avatarPreview, avatarPreviewLetter;
    let profileModal, closeProfileModal, profileUsername, profileNewPassword, profileNewPasswordConfirm, profileAvatarPreview, profileAvatarInput, profileUpdateBtn, profileMessage;
    
    function showMessage(el, text, type) {
        if (!el) return;
        el.textContent = text;
        el.className = `auth-message show ${type}`;
        setTimeout(() => {
            if (el) el.classList.remove('show');
        }, 4000);
    }
    
    function hideMessage(el) {
        if (el) el.className = 'auth-message';
    }
    
    function closeAuthModal() {
        if (authModal) {
            authModal.hidden = true;
            authModal.style.display = 'none';
            document.body.style.overflow = '';
            if (loginForm) loginForm.reset();
            if (signupForm) signupForm.reset();
            if (loginContainer) loginContainer.hidden = false;
            if (signupContainer) signupContainer.hidden = true;
            hideMessage(authMessage);
        }
    }
    
    function closeProfileModalFunc() {
        if (profileModal) {
            profileModal.hidden = true;
            profileModal.style.display = 'none';
            document.body.style.overflow = '';
            if (profileMessage) hideMessage(profileMessage);
        }
    }
    
    function openAuthModal() {
        if (authModal) {
            authModal.hidden = false;
            authModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (loginContainer) loginContainer.hidden = false;
            if (signupContainer) signupContainer.hidden = true;
            if (loginUsername) loginUsername.focus();
            hideMessage(authMessage);
        }
    }
    
    async function uploadAvatar(file, userId) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/avatar.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(fileName);
        return publicUrl;
    }
    
    async function updateProfile(userId, updates) {
        const { error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', userId);
        if (error) throw error;
    }
    
    async function fetchProfile(userId) {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', userId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }
    
    async function updateUI(user) {
        if (user) {
            const profile = await fetchProfile(user.id);
            const username = profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Гость';
            const avatarUrl = profile?.avatar_url;
            
            if (authBtn) {
                authBtn.innerHTML = '';
                const avatarSpan = document.createElement('span');
                avatarSpan.className = 'user-avatar-circle';
                if (avatarUrl) {
                    const img = document.createElement('img');
                    img.src = avatarUrl;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.borderRadius = '50%';
                    img.style.objectFit = 'cover';
                    avatarSpan.appendChild(img);
                } else {
                    avatarSpan.textContent = username.charAt(0).toUpperCase();
                }
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
            localStorage.setItem('chat_user', JSON.stringify({ id: user.id, username, avatar: avatarUrl }));
            currentUser = user;
        } else {
            if (authBtn) {
                authBtn.innerHTML = 'Войти';
                authBtn.classList.remove('logged-in');
            }
            if (userPanel) userPanel.hidden = true;
            if (loginContainer) loginContainer.hidden = false;
            if (signupContainer) signupContainer.hidden = true;
            localStorage.removeItem('chat_user');
            currentUser = null;
        }
    }
    
    async function handleSignup(e) {
        e.preventDefault();
        hideMessage(authMessage);
        const username = signupUsername.value.trim();
        const emailRaw = signupEmail.value.trim();
        const password = signupPassword.value;
        const confirm = signupPasswordConfirm.value;
        const avatarFile = avatarInput.files[0];
        
        if (username.length < 3) return showMessage(authMessage, 'Логин минимум 3 символа', 'error');
        if (password.length < 6) return showMessage(authMessage, 'Пароль минимум 6 символов', 'error');
        if (password !== confirm) return showMessage(authMessage, 'Пароли не совпадают', 'error');
        
        const email = emailRaw || `${username}@chat.placeholder`;
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email, password,
                options: { data: { username } }
            });
            if (error) throw error;
            
            let avatarUrl = null;
            if (avatarFile && data.user) {
                avatarUrl = await uploadAvatar(avatarFile, data.user.id);
                await updateProfile(data.user.id, { avatar_url: avatarUrl });
            }
            
            showMessage(authMessage, '✅ Регистрация успешна! Теперь войдите.', 'success');
            signupForm.reset();
            if (avatarPreview) {
                avatarPreview.style.backgroundImage = '';
                if (avatarPreviewLetter) avatarPreviewLetter.textContent = '?';
            }
            if (loginContainer) loginContainer.hidden = false;
            if (signupContainer) signupContainer.hidden = true;
            if (loginUsername) loginUsername.value = emailRaw || username;
        } catch (err) {
            let msg = err.message;
            if (msg.includes('User already registered')) msg = 'Пользователь уже существует';
            showMessage(authMessage, '❌ ' + msg, 'error');
        }
    }
    
    async function handleLogin(e) {
        e.preventDefault();
        hideMessage(authMessage);
        const loginValue = loginUsername.value.trim();
        const password = loginPassword.value;
        if (!loginValue || !password) return showMessage(authMessage, 'Заполните оба поля', 'error');
        const email = loginValue.includes('@') ? loginValue : `${loginValue}@chat.placeholder`;
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showMessage(authMessage, '✅ Добро пожаловать!', 'success');
            loginForm.reset();
            closeAuthModal();
        } catch (err) {
            let msg = err.message;
            if (msg.includes('Invalid login credentials')) msg = 'Неверный логин или пароль';
            showMessage(authMessage, '❌ ' + msg, 'error');
        }
    }
    
    async function handleLogout() {
        await supabaseClient.auth.signOut();
        closeAuthModal();
        closeProfileModalFunc();
    }
    
    async function openProfileModal() {
        if (!currentUser) return;
        const profile = await fetchProfile(currentUser.id);
        if (profileUsername) profileUsername.value = profile?.username || '';
        if (profileAvatarPreview) {
            if (profile?.avatar_url) {
                profileAvatarPreview.style.backgroundImage = `url(${profile.avatar_url})`;
                profileAvatarPreview.style.backgroundSize = 'cover';
                profileAvatarPreview.textContent = '';
            } else {
                profileAvatarPreview.style.backgroundImage = '';
                profileAvatarPreview.textContent = (profile?.username?.charAt(0) || '?').toUpperCase();
            }
        }
        if (profileModal) {
            profileModal.hidden = false;
            profileModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (profileMessage) hideMessage(profileMessage);
        }
    }
    
    async function handleProfileUpdate(e) {
        e.preventDefault();
        if (!currentUser) return;
        hideMessage(profileMessage);
        
        const newUsername = profileUsername.value.trim();
        const newPassword = profileNewPassword.value;
        const confirmPassword = profileNewPasswordConfirm.value;
        const avatarFile = profileAvatarInput.files[0];
        
        try {
            const updates = {};
            
            // Обновляем username
            if (newUsername) {
                if (newUsername.length < 3) throw new Error('Логин минимум 3 символа');
                updates.username = newUsername;
            }
            
            // Обновляем пароль
            if (newPassword) {
                if (newPassword.length < 6) throw new Error('Пароль минимум 6 символов');
                if (newPassword !== confirmPassword) throw new Error('Пароли не совпадают');
                const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
                if (error) throw error;
            }
            
            // Обновляем аватар
            if (avatarFile) {
                const avatarUrl = await uploadAvatar(avatarFile, currentUser.id);
                updates.avatar_url = avatarUrl;
            }
            
            // Обновляем профиль в таблице profiles
            if (Object.keys(updates).length > 0) {
                await updateProfile(currentUser.id, updates);
            }
            
            showMessage(profileMessage, '✅ Профиль обновлён!', 'success');
            setTimeout(() => {
                closeProfileModalFunc();
                updateUI(currentUser);
            }, 1500);
        } catch (err) {
            showMessage(profileMessage, '❌ ' + err.message, 'error');
        }
    }
    
    async function initSupabase() {
        if (!window.supabase) {
            console.error('❌ Библиотека Supabase не загружена');
            return false;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { session } } = await supabaseClient.auth.getSession();
        await updateUI(session?.user || null);
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            await updateUI(session?.user || null);
            if (event === 'SIGNED_IN') closeAuthModal();
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
        
        avatarInput = document.getElementById('avatarInput');
        avatarPreview = document.getElementById('avatarPreview');
        avatarPreviewLetter = document.getElementById('avatarPreviewLetter');
        
        profileModal = document.getElementById('profileModal');
        closeProfileModal = document.getElementById('closeProfileModal');
        profileUsername = document.getElementById('profileUsername');
        profileNewPassword = document.getElementById('profileNewPassword');
        profileNewPasswordConfirm = document.getElementById('profileNewPasswordConfirm');
        profileAvatarPreview = document.getElementById('profileAvatarPreview');
        profileAvatarInput = document.getElementById('profileAvatarInput');
        profileUpdateBtn = document.getElementById('profileUpdateBtn');
        profileMessage = document.getElementById('profileMessage');
        
        if (!authBtn || !authModal) {
            console.error('❌ Кнопка или модальное окно не найдены');
            return;
        }
        
        await initSupabase();
        
        // Обработчик кнопки "Войти" / профиль
        authBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                openProfileModal();
            } else {
                openAuthModal();
            }
        });
        
        // Закрытие модалок по крестику
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeAuthModal);
        if (closeProfileModal) closeProfileModal.addEventListener('click', closeProfileModalFunc);
        
        // Переключение между формами регистрации/входа
        if (switchToSignup) {
            switchToSignup.addEventListener('click', () => {
                loginContainer.hidden = true;
                signupContainer.hidden = false;
                hideMessage(authMessage);
                if (signupUsername) signupUsername.focus();
            });
        }
        if (switchToLogin) {
            switchToLogin.addEventListener('click', () => {
                loginContainer.hidden = false;
                signupContainer.hidden = true;
                hideMessage(authMessage);
                if (loginUsername) loginUsername.focus();
            });
        }
        
        // Загрузка аватарки при регистрации
        const avatarUploader = document.querySelector('#signupFormContainer .avatar-uploader');
        if (avatarUploader && avatarInput) {
            avatarUploader.addEventListener('click', () => avatarInput.click());
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (avatarPreview) {
                            avatarPreview.style.backgroundImage = `url(${event.target.result})`;
                            avatarPreview.style.backgroundSize = 'cover';
                            avatarPreview.textContent = '';
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    if (avatarPreview) {
                        avatarPreview.style.backgroundImage = '';
                        if (avatarPreviewLetter) avatarPreviewLetter.textContent = '?';
                    }
                }
            });
        }
        
        // Загрузка аватарки в профиле
        const profileAvatarUploader = document.querySelector('#profileModal .avatar-uploader');
        if (profileAvatarUploader && profileAvatarInput) {
            profileAvatarUploader.addEventListener('click', () => profileAvatarInput.click());
            profileAvatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (profileAvatarPreview) {
                            profileAvatarPreview.style.backgroundImage = `url(${event.target.result})`;
                            profileAvatarPreview.style.backgroundSize = 'cover';
                            profileAvatarPreview.textContent = '';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // Отправка форм
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (profileUpdateBtn) profileUpdateBtn.addEventListener('click', handleProfileUpdate);
        
        console.log('✅ auth.js загружен, аватарки и профиль готовы');
    });
})();
