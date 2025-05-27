// public/js_fe/index.js
const API_BASE_URL = 'http://localhost:5000/api';

// Lấy các phần tử DOM cho header nav
const loggedInNav = document.getElementById('loggedInNav');
const loggedOutNav = document.getElementById('loggedOutNav');
const headerUsernameSpan = document.getElementById('headerUsernameSpan');
const logoutBtn = document.getElementById('logoutBtn');

// Lấy các phần tử DOM cho nội dung chính
const userDashboard = document.getElementById('user-dashboard');
const songsSection = document.getElementById('songs-section');
const songsContainer = document.getElementById('songs-container');

// Hàm kiểm tra trạng thái đăng nhập và cập nhật UI
async function checkLoginStatus() {
    const token = localStorage.getItem('jwtToken');
    if (token) {
        try {
            // Giả định token hợp lệ và có thể giải mã để lấy username.
            // Trong ứng dụng thực tế, bạn nên gửi token về backend để xác thực
            // trước khi hiển thị thông tin người dùng.
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payloadBase64));
            
            headerUsernameSpan.textContent = decodedPayload.user.username;

            // Hiển thị navigation cho người dùng đã đăng nhập
            loggedInNav.style.display = 'block';
            loggedOutNav.style.display = 'none';

            // Hiển thị các phần nội dung chính (dashboard, danh sách nhạc)
            userDashboard.style.display = 'block';
            songsSection.style.display = 'block'; // Hiển thị danh sách nhạc

            // Fetch và hiển thị danh sách bài hát
            await fetchSongs();

        } catch (e) {
            console.error("Lỗi giải mã token hoặc token không hợp lệ:", e);
            localStorage.removeItem('jwtToken'); // Xóa token lỗi
            // Nếu token lỗi, coi như chưa đăng nhập và chỉ hiển thị phần công khai
            loggedInNav.style.display = 'none';
            loggedOutNav.style.display = 'block';
            userDashboard.style.display = 'none'; // Ẩn dashboard
            songsSection.style.display = 'block'; // Vẫn hiển thị danh sách nhạc cho mọi người
            await fetchSongs(); // Fetch nhạc ở chế độ công khai
        }
    } else {
        // Nếu không có token, chỉ hiển thị navigation đăng nhập/đăng ký và danh sách nhạc
        loggedInNav.style.display = 'none';
        loggedOutNav.style.display = 'block';
        userDashboard.style.display = 'none'; // Ẩn dashboard
        songsSection.style.display = 'block'; // Vẫn hiển thị danh sách nhạc cho mọi người
        await fetchSongs(); // Fetch nhạc ở chế độ công khai
    }
}

// Hàm render danh sách bài hát (giữ nguyên)
function renderSongs(songs) {
    songsContainer.innerHTML = '';

    if (songs.length === 0) {
        songsContainer.innerHTML = '<p>Chưa có bài hát nào trong danh sách.</p>';
        return;
    }

    songs.forEach(song => {
        const songCard = document.createElement('div');
        songCard.classList.add('song-card');
        songCard.dataset.songId = song.id; // Đảm bảo song.id có giá trị đúng
        songCard.classList.add('clickable-song-card');

        const coverArtUrl = song.cover_art_url ? `http://localhost:5000${song.cover_art_url}` : 'https://via.placeholder.com/200?text=No+Cover';
        const musicFileUrl = `http://localhost:5000${song.file_path}`;

        songCard.innerHTML = `
            <img src="${coverArtUrl}" alt="${song.title} Cover">
            <h3>${song.title}</h3>
            <p>${song.artist}</p>
            <audio controls class="audio-player">
                <source src="${musicFileUrl}" type="audio/mpeg">
                Trình duyệt của bạn không hỗ trợ thẻ audio.
            </audio>
        `;
        songsContainer.appendChild(songCard);
    });

    // CẬP NHẬT PHẦN LẮNG NGHE SỰ KIỆN CLICK DƯỚI ĐÂY
    document.querySelectorAll('.clickable-song-card').forEach(card => {
        card.addEventListener('click', (event) => {
            // Kiểm tra kỹ hơn nếu click vào phần tử con của audio player
            if (event.target.tagName === 'AUDIO' || event.target.tagName === 'SOURCE' || event.target.closest('audio')) {
                console.log('[INDEX.JS] Click vào audio player, không điều hướng.');
                return; // Ngăn chặn điều hướng nếu click vào audio controls
            }

            const songId = card.dataset.songId;
            // --- THÊM LOG ĐỂ DEBUG ---
            console.log('[INDEX.JS - LOG 1] Card được click. songId từ dataset:', songId);
            console.log('[INDEX.JS - LOG 2] Kiểu dữ liệu của songId:', typeof songId);
            // -------------------------

            if (songId && String(songId).trim() !== "") { // Kiểm tra songId hợp lệ và không rỗng
                const targetUrl = `/songs/${songId}`;
                // --- THÊM LOG ĐỂ DEBUG ---
                console.log('[INDEX.JS - LOG 3] Chuẩn bị điều hướng đến URL:', targetUrl);
                // -------------------------
                window.location.href = targetUrl;
            } else {
                // --- THÊM LOG ĐỂ DEBUG ---
                console.error('[INDEX.JS - LOG 4] songId không hợp lệ hoặc rỗng:', songId, '- Sẽ không điều hướng.');
                alert('Lỗi: ID bài hát không hợp lệ.');
                // -------------------------
            }
        });
    });
}


// Hàm fetch danh sách bài hát từ Backend (giữ nguyên)
async function fetchSongs() {
    try {
        const response = await fetch(`${API_BASE_URL}/songs`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const songs = await response.json();
        renderSongs(songs);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài hát:', error);
        songsContainer.innerHTML = '<p class="error">Không thể tải danh sách bài hát. Vui lòng thử lại sau.</p>';
    }
}

// Xử lý nút Đăng xuất
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    // Cập nhật lại UI sau khi đăng xuất (sẽ hiển thị link đăng nhập/đăng ký)
    checkLoginStatus(); 
});

// Gọi hàm kiểm tra trạng thái đăng nhập khi trang được tải
document.addEventListener('DOMContentLoaded', checkLoginStatus);