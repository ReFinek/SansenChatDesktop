document.addEventListener('DOMContentLoaded', () => {
    const authBtn = document.getElementById('authBtn');
    const authModal = document.getElementById('authModal');
    const closeModal = document.getElementById('closeModal');
    
    console.log('authBtn:', authBtn);
    console.log('authModal:', authModal);
    
    if (authBtn && authModal) {
        authBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Клик сработал!');
            authModal.hidden = false;
            authModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
        
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                authModal.hidden = true;
                authModal.style.display = 'none';
                document.body.style.overflow = '';
            });
        }
        
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.hidden = true;
                authModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    } else {
        console.error('Кнопка или модалка не найдены!');
    }
});
