// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Password toggle functionality
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Toggle icon
            const icon = this.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Password strength indicator
    const passwordInput = document.getElementById('regPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strengthBar = document.querySelector('.strength-bar');
            const strengthLabel = document.getElementById('strengthLabel');
            
            // Calculate password strength
            let strength = 0;
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            // Update UI
            const width = strength * 25;
            strengthBar.style.width = `${width}%`;
            
            const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
            const labels = ['Very Weak', 'Weak', 'Good', 'Strong'];
            
            strengthBar.style.background = colors[strength] || '#ef4444';
            if (strengthLabel) {
                strengthLabel.textContent = labels[strength] || 'Very Weak';
                strengthLabel.style.color = colors[strength] || '#ef4444';
            }
        });
    }

    // Form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form type
            const isLoginForm = form.id === 'loginForm';
            const isRegisterForm = form.id === 'registerForm';
            
            try {
                APIUtils.showLoading();
                
                if (isLoginForm) {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    
                    const response = await AuthAPI.login(email, password);
                    
                    // Store tokens and user data
                    localStorage.setItem('access_token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    
                    APIUtils.showToast('Login successful! Redirecting...', 'success');
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                    
                } else if (isRegisterForm) {
                    const firstName = document.getElementById('firstName').value;
                    const lastName = document.getElementById('lastName').value;
                    const email = document.getElementById('regEmail').value;
                    const password = document.getElementById('regPassword').value;
                    
                    
                    const userData = {
                        email,
                        password,
                        firstName,
                        lastName
                    };
                    
                    const response = await AuthAPI.register(userData);
                    
                    APIUtils.showToast('Account created successfully!', 'success');
                    
                    // Redirect to login
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                    
                }
                
            } catch (error) {
                APIUtils.showToast(error.message, 'error');
            } finally {
                APIUtils.hideLoading();
            }
        });
    });

    // Remember me functionality
    const rememberMeCheckbox = document.getElementById('rememberMe');
    if (rememberMeCheckbox) {
        // Load saved email if exists
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail && document.getElementById('email')) {
            document.getElementById('email').value = savedEmail;
            rememberMeCheckbox.checked = true;
        }
        
        rememberMeCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                localStorage.removeItem('rememberedEmail');
            }
        });
    }

    // Save email on login form submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function() {
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe && rememberMe.checked) {
                const email = document.getElementById('email').value;
                localStorage.setItem('rememberedEmail', email);
            }
        });
    }

    // Mobile menu toggle
    const navToggle = document.getElementById('navToggle');
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            const navMenu = document.querySelector('.nav-menu');
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
        });
        
        // Close menu on click outside
        document.addEventListener('click', function(e) {
            const navMenu = document.querySelector('.nav-menu');
            if (navToggle && navMenu && !navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.style.display = 'none';
            }
        });
    }

    // Password confirmation validation
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const regPasswordInput = document.getElementById('regPassword');
    
    if (confirmPasswordInput && regPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = regPasswordInput.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.style.borderColor = '#ef4444';
                APIUtils.showToast('Passwords do not match', 'error');
            } else {
                this.style.borderColor = '#e5e7eb';
            }
        });
    }

    // Terms checkbox validation
    const termsCheckbox = document.getElementById('terms');
    const registerBtn = document.querySelector('#registerForm button[type="submit"]');
    
    if (termsCheckbox && registerBtn) {
        termsCheckbox.addEventListener('change', function() {
            registerBtn.disabled = !this.checked;
        });
        // Initialize button state
        registerBtn.disabled = !termsCheckbox.checked;
    }

    // Auto-hide toast on click
    document.addEventListener('click', function(e) {
        if (e.target.closest('.toast')) {
            const toast = e.target.closest('.toast');
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    });

    // Handle browser back/forward buttons
    window.addEventListener('pageshow', function(event) {
        // If page is loaded from cache, clear any existing toasts
        if (event.persisted) {
            const toasts = document.querySelectorAll('.toast');
            toasts.forEach(toast => toast.remove());
        }
    });
});

// Utility function to check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('access_token');
    const currentPage = window.location.pathname.split('/').pop();
    
    // If on auth pages and already logged in, redirect to dashboard
    if (token && ['login.html', 'register.html', 'index.html'].includes(currentPage)) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    // If on dashboard and not logged in, redirect to login
    if (!token && currentPage === 'dashboard.html') {
        window.location.href = 'login.html';
        return;
    }
}

// Run auth check on page load
document.addEventListener('DOMContentLoaded', checkAuth);

// Export functions
window.checkAuth = checkAuth;