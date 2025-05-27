// public/js_fe/login_register.js
const API_BASE_URL = 'http://localhost:5000/api';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');

function showMessage(element, msg, isError = false) {
    element.textContent = msg;
    element.className = 'message ' + (isError ? 'error' : 'success');
}

// Xử lý sự kiện Submit của form Đăng ký
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(registerMessage, data.msg);
            registerForm.reset();
            loginFormContainer.style.display = 'block';
            registerFormContainer.style.display = 'none';
            showMessage(loginMessage, 'Đăng ký thành công! Vui lòng đăng nhập.');
        } else {
            showMessage(registerMessage, data.msg, true);
        }
    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        showMessage(registerMessage, 'Đã xảy ra lỗi. Vui lòng thử lại.', true);
    }
});

// Xử lý sự kiện Submit của form Đăng nhập
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('jwtToken', data.token); // Lưu token
            showMessage(loginMessage, 'Đăng nhập thành công!');
            // CHUYỂN HƯỚNG SANG TRANG CHỦ KHI ĐĂNG NHẬP THÀNH CÔNG
            window.location.href = '/public/index.html'; 
        } else {
            showMessage(loginMessage, data.msg, true);
        }
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        showMessage(loginMessage, 'Đã xảy ra lỗi. Vui lòng thử lại.', true);
    }
});

// Chuyển đổi giữa form Đăng nhập và Đăng ký
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.style.display = 'none';
    registerFormContainer.style.display = 'block';
    loginMessage.textContent = '';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormContainer.style.display = 'block';
    registerFormContainer.style.display = 'none';
    registerMessage.textContent = '';
});

// Kiểm tra xem đã đăng nhập chưa, nếu có thì chuyển hướng ngay để không ở lại trang auth
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
        window.location.href = '/'; 
    }
});