// js/server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Để xử lý CORS giữa Frontend và Backend
const path = require('path'); // Import module path để xử lý đường dẫn
const crypto = require('crypto');     
const nodemailer = require('nodemailer'); 
// Load biến môi trường từ file .env ở thư mục gốc của dự án
// __dirname là đường dẫn đến thư mục hiện tại (js/)
// '..' là đi lên một cấp thư mục (đến thư mục gốc WEBNGHENHAC/)
// '.env' là tên file
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Import pool kết nối database
// Vì db.js nằm cùng cấp với server.js (cả hai đều trong thư mục js/),
// nên đường dẫn tương đối là './db'
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000; // Backend sẽ chạy trên cổng 5000

// Cấu hình Express để phục vụ các file tĩnh
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/music', express.static(path.join(__dirname, '..', 'music')));
//app.use('/public/assets', express.static(path.join(__dirname, '..', 'assets')));

// Middleware
app.use(express.json()); // Cho phép Express đọc JSON từ request body
app.use(cors()); // Cho phép Frontend (chạy trên port khác) gửi yêu cầu đến Backend

// API Đăng ký
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    // Kiểm tra dữ liệu đầu vào
    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Vui lòng nhập đầy đủ các trường.' });
    }
    try {
        // Kiểm tra xem username hoặc email đã tồn tại chưa
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        if (users.length > 0) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc email đã tồn tại.' });
        }
        // Băm mật khẩu (hash password)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // Lưu người dùng mới vào database
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.status(201).json({ msg: 'Đăng ký thành công!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi máy chủ.');
    }
});

// Route API Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    // Kiểm tra dữ liệu đầu vào
    if (!username || !password) {
        return res.status(400).json({ msg: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }
    try {
        // Tìm người dùng theo username
        const [users] = await pool.execute(
            'SELECT id, username, password FROM users WHERE username = ?',
            [username]
        );
        const user = users[0];
        if (!user) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
        // So sánh mật khẩu đã băm
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
        // Tạo JWT
        const payload = {
            user: {
                id: user.id,
                username: user.username
            }
        };
        jwt.sign(
            payload,
            process.env.JWT_SECRET, // Secret key của JWT từ .env
            { expiresIn: '1h' }, // Token hết hạn sau 1 giờ
            (err, token) => {
                if (err) throw err;
                res.json({ token }); // Trả về token cho Frontend
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi máy chủ.');
    }
});

// <--- ĐẢM BẢO KHỐI CẤU HÌNH NODEMAILER NÀY NẰM Ở ĐÂY HOẶC TRƯỚC CÁC API SỬ DỤNG NÓ ---
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});
// ----------------------------------------------------------------------------------



// --- Thêm: API Quên mật khẩu ---
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp địa chỉ email.' });
    }

    try {
        // 1. Tìm người dùng theo email
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE email = ?',
            [email]
        );
        const user = users[0];

        if (!user) {
            // Để tránh tiết lộ thông tin người dùng, luôn trả về thông báo thành công
            // dù email không tồn tại.
            console.log(`Yêu cầu quên mật khẩu cho email không tồn tại: ${email}`);
            return res.status(200).json({ msg: 'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một liên kết đặt lại mật khẩu.' });
        }

        // 2. Tạo token đặt lại mật khẩu và thời hạn
        const resetToken = crypto.randomBytes(32).toString('hex'); // Token ngẫu nhiên 64 ký tự
        const resetTokenExpires = Date.now() + 3600000; // Hết hạn sau 1 giờ (milliseconds)

        // 3. Lưu token và thời hạn vào database
        await pool.execute(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [resetToken, resetTokenExpires, user.id]
        );

        // 4. Gửi email chứa liên kết đặt lại mật khẩu
        // Đảm bảo URL này là URL Frontend của bạn (ví dụ: http://localhost:3000/reset-password)
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: `WEBNGHENHAC <${process.env.EMAIL_USER}>`, // Tên ứng dụng của bạn và email gửi đi
            to: user.email,
            subject: 'Yêu cầu đặt lại mật khẩu WEBNGHENHAC của bạn',
            html: `
                <p>Chào ${user.username || 'bạn'},</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình trên web VMUSIC của chúng tôi.</p>
                <p>Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
                <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Đã gửi email đặt lại mật khẩu đến: ${user.email}`);
        res.status(200).json({ msg: 'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một liên kết đặt lại mật khẩu.' });

    } catch (err) {
        console.error('Lỗi khi xử lý yêu cầu quên mật khẩu:', err.message);
        res.status(500).json({ msg: 'Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại.' });
    }
});

// Thêm: Route để phục vụ trang đặt lại mật khẩu (Frontend)
// Đây là GET request khi người dùng click vào link trong email
app.get('/reset-password', (req, res) => {
    // Trả về file HTML của trang đặt lại mật khẩu.
    // Frontend JS sẽ đọc token từ URL và hiển thị form.
    res.sendFile(path.join(__dirname, '..', 'public', 'reset_password.html'));
});

// Thêm: API để xử lý đặt lại mật khẩu thực tế
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ msg: 'Thông tin không đầy đủ.' });
    }

    try {
        // 1. Tìm người dùng bằng token và kiểm tra thời hạn
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > ?',
            [token, Date.now()]
        );
        const user = users[0];

        if (!user) {
            return res.status(400).json({ msg: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
        }

        // 2. Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Cập nhật mật khẩu mới và xóa token đặt lại
        await pool.execute(
            'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.status(200).json({ msg: 'Mật khẩu của bạn đã được đặt lại thành công!' });

    } catch (err) {
        console.error('Lỗi khi đặt lại mật khẩu:', err.message);
        res.status(500).json({ msg: 'Đã xảy ra lỗi khi đặt lại mật khẩu. Vui lòng thử lại.' });
    }
});
// --- Kết thúc API Quên mật khẩu ---

// API để lấy danh sách bài hát
app.get('/api/songs', async (req, res) => {
    try {
        // Sử dụng pool.execute (vì đã cấu hình bằng mysql2/promise)
        const [songs] = await pool.execute('SELECT * FROM songs');
        res.json(songs); // Trả về danh sách bài hát dưới dạng JSON
    } catch (err) {
        console.error('Lỗi truy vấn danh sách bài hát:', err.message);
        res.status(500).send('Lỗi truy vấn CSDL khi lấy danh sách bài hát.');
    }
});
// API để lấy chi tiết một bài hát theo ID
app.get('/api/songs/:id', async (req, res) => {
    // Lấy ID bài hát từ tham số URL
    // Ví dụ: nếu URL là /api/songs/123, thì req.params.id sẽ là '123'
    const songId = req.params.id; 
    try {
        // Truy vấn database để lấy bài hát có ID tương ứng
        const [songs] = await pool.execute('SELECT * FROM songs WHERE id = ?', [songId]);
        // Kiểm tra xem có tìm thấy bài hát nào không
        const song = songs[0];
        if (!song) {
            // Nếu không tìm thấy, trả về lỗi 404 Not Found
            return res.status(404).json({ msg: 'Bài hát không tìm thấy.' });
        }
        // Nếu tìm thấy, trả về chi tiết bài hát dưới dạng JSON
        res.json(song);
    } catch (err) {
        // Xử lý lỗi nếu có vấn đề trong quá trình truy vấn database
        console.error(`Lỗi khi lấy chi tiết bài hát ID ${songId}:`, err.message);
        res.status(500).send('Lỗi máy chủ khi lấy chi tiết bài hát.');
    }
});
app.get('/songs/:id', (req, res, next) => {
    console.log(`[SERVER LOG] Yêu cầu đến trang HTML: /songs/${req.params.id}`);
    const filePath = path.join(__dirname, '..', 'public', 'song_detail.html');
    console.log(`[SERVER LOG] Đang cố gắng gửi file: ${filePath}`);

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[SERVER LOG] Lỗi khi gửi file song_detail.html:', err.message);
            next(err); // Quan trọng: chuyển lỗi cho Express xử lý
        } else {
            console.log('[SERVER LOG] Đã gửi file song_detail.html thành công.');
        }
    });
});

// Start server
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));