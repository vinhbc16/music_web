// public/js_fe/my_favorites.js
const API_BASE_URL = 'http://localhost:5000/api';
const favoriteSongsContainer = document.getElementById('favorite-songs-container');
const loggedInNavForFavorites = document.getElementById('loggedInNav'); // Để check login status trên header
const loggedOutNavForFavorites = document.getElementById('loggedOutNav');
const headerUsernameSpanForFavorites = document.getElementById('headerUsernameSpan');
const logoutBtnForFavorites = document.getElementById('logoutBtn');


// Hàm kiểm tra đăng nhập (có thể tách ra file common.js)
function isLoggedInFavoritesPage() {
    return localStorage.getItem('jwtToken') !== null;
}

// Hàm render danh sách bài hát (tương tự index.js nhưng có thể tùy chỉnh)
function renderFavoriteSongs(songs) {
    favoriteSongsContainer.innerHTML = '';

    if (!songs || songs.length === 0) {
        favoriteSongsContainer.innerHTML = '<p class="no-favorites">Bạn chưa có bài hát yêu thích nào. Hãy <a href="/">khám phá</a> và thêm vào nhé!</p>';
        return;
    }

    songs.forEach(song => {
        const songCard = document.createElement('div');
        songCard.classList.add('song-card'); // Sử dụng lại class từ index.css
        songCard.dataset.songId = song.id;
        songCard.classList.add('clickable-song-card'); // Để có thể click

        const coverArtUrl = song.cover_art_url ? `http://localhost:5000${song.cover_art_url}` : 'https://via.placeholder.com/200?text=No+Cover';
        const musicFileUrl = `http://localhost:5000${song.file_path}`; // Cần file_path để phát nhạc nếu muốn

        songCard.innerHTML = `
            <img src="${coverArtUrl}" alt="${song.title} Cover">
            <h3>${song.title}</h3>
            <p>${song.artist}</p>
            <audio controls class="audio-player">
                <source src="${musicFileUrl}" type="audio/mpeg">
                Trình duyệt của bạn không hỗ trợ thẻ audio.
            </audio>
        `;
        favoriteSongsContainer.appendChild(songCard);
    });

    // Gắn event listeners cho các card bài hát yêu thích
    document.querySelectorAll('#favorite-songs-container .clickable-song-card').forEach(card => {
        card.addEventListener('click', (event) => {
            // Ngăn điều hướng nếu click vào audio controls
            if (event.target.tagName === 'AUDIO' || event.target.tagName === 'SOURCE' || event.target.closest('audio')) {
                return;
            }
            const songId = card.dataset.songId;
            if (songId) {
                window.location.href = `/songs/${songId}`;
            }
        });
    });
}

// Hàm fetch chi tiết từng bài hát dựa trên ID (GIẢ LẬP)
// Trong thực tế, API backend của bạn nên có endpoint GET /api/favorites trả về đầy đủ thông tin bài hát.
// Hoặc, bạn sẽ fetch từng bài hát một nếu API /api/favorites chỉ trả về mảng các songId.
async function fetchSongDetailsById(songId) {
    try {
        const response = await fetch(`${API_BASE_URL}/songs/${songId}`);
        if (!response.ok) {
            console.error(`Không thể tải chi tiết bài hát ID: ${songId}. Status: ${response.status}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Lỗi khi tải chi tiết bài hát ID: ${songId}:`, error);
        return null;
    }
}


// Hàm tải và hiển thị các bài hát yêu thích
async function loadFavoriteSongs() {
    if (!isLoggedInFavoritesPage()) {
        alert('Bạn cần đăng nhập để xem danh sách bài hát yêu thích.');
        window.location.href = '/login_register.html'; // Chuyển đến trang đăng nhập
        return;
    }

    // GIẢ LẬP: Lấy danh sách ID bài hát yêu thích từ localStorage
    const favoriteSongIds = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');

    if (favoriteSongIds.length === 0) {
        renderFavoriteSongs([]);
        return;
    }

    // GIẢ LẬP: Fetch chi tiết từng bài hát.
    // TỐT HƠN: Backend nên có API trả về danh sách các object bài hát yêu thích đầy đủ.
    // Ví dụ: GET /api/me/favorites -> [{id:1, title:'...', artist:'...'}, ...]
    const songDetailsPromises = favoriteSongIds.map(id => fetchSongDetailsById(id));
    const favoriteSongsDetails = (await Promise.all(songDetailsPromises)).filter(song => song !== null);

    console.log('Chi tiết các bài hát yêu thích đã fetch:', favoriteSongsDetails);
    renderFavoriteSongs(favoriteSongsDetails);
}

document.addEventListener('DOMContentLoaded', () => {
    // Hàm checkLoginStatus từ index.js được gọi do script index.js được include trong HTML.
    // Nó sẽ xử lý việc hiển thị header.

    loadFavoriteSongs();
});