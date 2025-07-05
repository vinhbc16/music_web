// js/server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/music', express.static(path.join(__dirname, '..', 'music')));

app.use(express.json());
app.use(cors());

// --- START: JWT AUTHENTICATION MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
    // Lấy token từ header 'Authorization'
    const authHeader = req.header('Authorization');

    // Kiểm tra xem header có tồn tại và có định dạng 'Bearer token' không
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'Không có token, ủy quyền bị từ chối.' });
    }

    try {
        const token = authHeader.split(' ')[1]; // Lấy phần token sau 'Bearer '
        // Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Gắn thông tin người dùng đã giải mã vào đối tượng request
        // để các route handler sau có thể sử dụng
        req.user = decoded.user; // payload khi tạo token là { user: { id: user.id, username: user.username } }
        next(); // Chuyển sang middleware hoặc route handler tiếp theo
    } catch (err) {
        console.error('Lỗi xác thực token:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token đã hết hạn.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ msg: 'Token không hợp lệ.' });
        }
        res.status(401).json({ msg: 'Token không hợp lệ hoặc có lỗi xảy ra.' });
    }
};
// --- END: JWT AUTHENTICATION MIDDLEWARE ---


// API Đăng ký
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Vui lòng nhập đầy đủ các trường.' });
    }
    try {
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        if (users.length > 0) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc email đã tồn tại.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        res.status(201).json({ msg: 'Đăng ký thành công!' });
    } catch (err) {
        console.error('Lỗi đăng ký:', err.message);
        res.status(500).send('Lỗi máy chủ khi đăng ký.');
    }
});

// API Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ msg: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }
    try {
        const [users] = await pool.execute(
            'SELECT id, username, password FROM users WHERE username = ?',
            [username]
        );
        const user = users[0];
        if (!user) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }
        const payload = {
            user: {
                id: user.id,
                username: user.username
            }
        };
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token có thể đặt thời gian hết hạn dài hơn, ví dụ: '24h' hoặc '7d'
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error('Lỗi đăng nhập:', err.message);
        res.status(500).send('Lỗi máy chủ khi đăng nhập.');
    }
});

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

// API Quên mật khẩu
app.post('/api/forgot-password', async (req, res) => {
    // ... (giữ nguyên code của bạn)
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ msg: 'Vui lòng cung cấp địa chỉ email.' });
    }
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email FROM users WHERE email = ?',
            [email]
        );
        const user = users[0];
        if (!user) {
            console.log(`Yêu cầu quên mật khẩu cho email không tồn tại: ${email}`);
            return res.status(200).json({ msg: 'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một liên kết đặt lại mật khẩu.' });
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 giờ
        await pool.execute(
            'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
            [resetToken, resetTokenExpires, user.id]
        );
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: `WEBNGHENHAC <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Yêu cầu đặt lại mật khẩu WEBNGHENHAC của bạn',
            html: `
                <p>Chào ${user.username || 'bạn'},</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình trên VMUSIC.</p>
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

app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'reset_password.html'));
});

app.post('/api/reset-password', async (req, res) => {
    // ... (giữ nguyên code của bạn)
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ msg: 'Thông tin không đầy đủ.' });
    }
    try {
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE reset_password_token = ? AND reset_password_expires > ?',
            [token, Date.now()]
        );
        const user = users[0];
        if (!user) {
            return res.status(400).json({ msg: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
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

// API để lấy danh sách bài hát
app.get('/api/songs', async (req, res) => {
    try {
        const [songs] = await pool.execute('SELECT * FROM songs');
        res.json(songs);
    } catch (err) {
        console.error('Lỗi truy vấn danh sách bài hát:', err.message);
        res.status(500).send('Lỗi truy vấn CSDL khi lấy danh sách bài hát.');
    }
});

// API để lấy chi tiết một bài hát theo ID
app.get('/api/songs/:id', async (req, res) => {
    const songId = req.params.id;
    try {
        const [songs] = await pool.execute('SELECT * FROM songs WHERE id = ?', [songId]);
        const song = songs[0];
        if (!song) {
            return res.status(404).json({ msg: 'Bài hát không tìm thấy.' });
        }
        res.json(song);
    } catch (err) {
        console.error(`Lỗi khi lấy chi tiết bài hát ID ${songId}:`, err.message);
        res.status(500).send('Lỗi máy chủ khi lấy chi tiết bài hát.');
    }
});


// --- START: COMMENT APIs ---

// API để lấy danh sách bình luận cho một bài hát
app.get('/api/songs/:songId/comments', async (req, res) => {
    const { songId } = req.params;
    try {
        // Kiểm tra songId có hợp lệ không (phải là số)
        if (isNaN(parseInt(songId))) {
            return res.status(400).json({ msg: 'ID bài hát không hợp lệ.' });
        }

        // Truy vấn lấy bình luận và thông tin người dùng (username)
        // Sắp xếp theo thời gian tạo, bình luận mới nhất lên đầu (DESC) hoặc cũ nhất (ASC)
        const query = `
            SELECT 
                c.id, 
                c.content, 
                c.created_at, 
                c.updated_at,
                c.parent_comment_id,
                u.id as user_id, 
                u.username as username 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.song_id = ?
            ORDER BY c.created_at ASC; 
        `;
        // Sắp xếp theo created_at ASC để hiển thị bình luận theo thứ tự thời gian, có thể dùng DESC cho bình luận mới nhất lên đầu
        const [comments] = await pool.execute(query, [songId]);
        
        res.json(comments);
    } catch (err) {
        console.error(`Lỗi khi lấy bình luận cho bài hát ID ${songId}:`, err.message);
        res.status(500).send('Lỗi máy chủ khi lấy danh sách bình luận.');
    }
});

// API để đăng một bình luận mới cho bài hát
// Yêu cầu người dùng phải đăng nhập (sử dụng authMiddleware)
app.post('/api/songs/:songId/comments', authMiddleware, async (req, res) => {
    const { songId } = req.params;
    const { content, parent_comment_id } = req.body; // Lấy content và parent_comment_id (nếu có) từ request body
    const userId = req.user.id; // Lấy user_id từ thông tin người dùng đã xác thực (gắn bởi authMiddleware)

    // Kiểm tra dữ liệu đầu vào
    if (!content || content.trim() === '') {
        return res.status(400).json({ msg: 'Nội dung bình luận không được để trống.' });
    }
    if (isNaN(parseInt(songId))) {
        return res.status(400).json({ msg: 'ID bài hát không hợp lệ.' });
    }
    // (Tùy chọn) Kiểm tra parent_comment_id nếu được cung cấp
    if (parent_comment_id && isNaN(parseInt(parent_comment_id))) {
        return res.status(400).json({ msg: 'ID bình luận cha không hợp lệ.' });
    }


    try {
        // Kiểm tra xem bài hát có tồn tại không
        const [songs] = await pool.execute('SELECT id FROM songs WHERE id = ?', [songId]);
        if (songs.length === 0) {
            return res.status(404).json({ msg: 'Bài hát không tồn tại để bình luận.' });
        }
        
        // (Tùy chọn) Kiểm tra xem parent_comment_id (nếu có) có tồn tại và thuộc cùng song_id không
        if (parent_comment_id) {
            const [parentComments] = await pool.execute(
                'SELECT id FROM comments WHERE id = ? AND song_id = ?', 
                [parent_comment_id, songId]
            );
            if (parentComments.length === 0) {
                return res.status(400).json({ msg: 'Bình luận cha không tồn tại hoặc không thuộc bài hát này.' });
            }
        }


        // Thêm bình luận mới vào database
        const [result] = await pool.execute(
            'INSERT INTO comments (song_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
            [songId, userId, content, parent_comment_id || null] // Nếu parent_comment_id không có thì truyền NULL
        );

        // Lấy lại bình luận vừa tạo để trả về (bao gồm username)
        const newCommentId = result.insertId;
        const [newComments] = await pool.execute(
            `SELECT c.id, c.content, c.created_at, c.parent_comment_id, u.id as user_id, u.username 
             FROM comments c JOIN users u ON c.user_id = u.id 
             WHERE c.id = ?`,
            [newCommentId]
        );
        
        res.status(201).json(newComments[0]); // Trả về bình luận vừa tạo

    } catch (err) {
        console.error(`Lỗi khi đăng bình luận cho bài hát ID ${songId}:`, err.message);
        res.status(500).send('Lỗi máy chủ khi đăng bình luận.');
    }
});

// --- END: COMMENT APIs ---


// Route để phục vụ file HTML chi tiết bài hát
app.get('/songs/:id', (req, res, next) => {
    console.log(`[SERVER LOG] Yêu cầu đến trang HTML: /songs/${req.params.id}`);
    const filePath = path.join(__dirname, '..', 'public', 'song_detail.html');
    console.log(`[SERVER LOG] Đang cố gắng gửi file: ${filePath}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('[SERVER LOG] Lỗi khi gửi file song_detail.html:', err.message);
            next(err);
        } else {
            console.log('[SERVER LOG] Đã gửi file song_detail.html thành công.');
        }
    });
});

// Start server
app.listen(PORT, () => console.log(`Server đang chạy trên cổng ${PORT}`));