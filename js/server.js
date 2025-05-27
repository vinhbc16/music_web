// js/server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Để xử lý CORS giữa Frontend và Backend
const path = require('path'); // Import module path để xử lý đường dẫn

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

// Start server
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));