// public/js_fe/index.js
const API_BASE_URL = 'http://localhost:5000/api';

// --- CÁC HẰNG SỐ CẤU HÌNH ---
const MAX_RECENTLY_PLAYED = 5;
const MAX_MOST_PLAYED = 5;

// --- LẤY CÁC PHẦN TỬ DOM ---
const loggedInNav = document.getElementById('loggedInNav');
const loggedOutNav = document.getElementById('loggedOutNav');
const headerUsernameSpan = document.getElementById('headerUsernameSpan');
const logoutBtn = document.getElementById('logoutBtn');
const songsContainer = document.getElementById('songs-container');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const personalizedSections = document.getElementById('personalized-sections');
const recentlyPlayedContainer = document.getElementById('recently-played-container');
const mostPlayedContainer = document.getElementById('most-played-container');

// --- BIẾN TOÀN CỤC ---
let allFetchedSongs = [];

// --- CÁC HÀM LƯU VÀ LẤY DỮ LIỆU TỪ LOCALSTORAGE ---
function trackRecentlyPlayed(songId) {
    if (!songId) return;
    let recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
    recentlyPlayed = recentlyPlayed.filter(id => id !== songId);
    recentlyPlayed.unshift(songId);
    const sliced = recentlyPlayed.slice(0, MAX_RECENTLY_PLAYED);
    localStorage.setItem('recentlyPlayed', JSON.stringify(sliced));
}

function trackPlayCount(songId) {
    if (!songId) return;
    let playCounts = JSON.parse(localStorage.getItem('playCounts')) || {};
    playCounts[songId] = (playCounts[songId] || 0) + 1;
    localStorage.setItem('playCounts', JSON.stringify(playCounts));
}

// --- CÁC HÀM HIỂN THỊ DỮ LIỆU ---

/**
 * QUAN TRỌNG: Hàm này tạo card bài hát VÀ gắn sự kiện click để điều hướng
 */
function createIndexSongCardElement(song) {
    const songCard = document.createElement('div');
    songCard.classList.add('song-card');
    // Lưu ID bài hát vào data attribute để sử dụng sau này
    songCard.dataset.songId = song.id;

    const coverArtUrl = song.cover_art_url ? (song.cover_art_url.startsWith('http') ? song.cover_art_url : `http://localhost:5000${song.cover_art_url}`) : 'https://via.placeholder.com/200?text=No+Cover';
    const musicFileUrl = song.file_path ? (song.file_path.startsWith('http') ? song.file_path : `http://localhost:5000${song.file_path}`) : '#';

    songCard.innerHTML = `
        <img src="${coverArtUrl}" alt="${song.title || 'Song'} Cover">
        <h3>${song.title || 'Chưa có tên'}</h3>
        <p>${song.artist || 'Nghệ sĩ không xác định'}</p>
        <audio controls class="audio-player" preload="none">
            <source src="${musicFileUrl}" type="audio/mpeg">
            Trình duyệt của bạn không hỗ trợ thẻ audio.
        </audio>
    `;

    const audioPlayer = songCard.querySelector('.audio-player');
    audioPlayer.addEventListener('play', () => {
        trackRecentlyPlayed(song.id);
        trackPlayCount(song.id);
    });

    // === PHẦN XỬ LÝ CHUYỂN TRANG KHI CLICK VÀO BÀI HÁT ===
    songCard.addEventListener('click', (event) => {
        // Ngăn chuyển trang nếu người dùng click vào trình phát nhạc
        if (event.target.tagName === 'AUDIO' || event.target.closest('audio')) {
            return;
        }
        // Nếu click vào bất cứ đâu khác trên card, chuyển đến trang chi tiết
        if (song.id) {
            window.location.href = `/songs/${song.id}`; // Đây là dòng code điều hướng
        }
    });

    return songCard;
}


function displayRecentlyPlayed() {
    if (!recentlyPlayedContainer) return;
    const recentlyPlayedIds = JSON.parse(localStorage.getItem('recentlyPlayed')) || [];
    recentlyPlayedContainer.innerHTML = '';
    if (recentlyPlayedIds.length === 0) {
        recentlyPlayedContainer.innerHTML = '<p class="no-data-message">Bạn chưa nghe bài hát nào gần đây.</p>';
        return;
    }
    const recentSongs = recentlyPlayedIds.map(id => allFetchedSongs.find(song => song.id === id)).filter(song => song);
    recentSongs.forEach(song => {
        recentlyPlayedContainer.appendChild(createIndexSongCardElement(song));
    });
}

function displayMostPlayed() {
    if (!mostPlayedContainer) return;
    const playCounts = JSON.parse(localStorage.getItem('playCounts')) || {};
    mostPlayedContainer.innerHTML = '';
    const sortedSongIds = Object.entries(playCounts).sort(([, a], [, b]) => b - a).slice(0, MAX_MOST_PLAYED);
    if (sortedSongIds.length === 0) {
        mostPlayedContainer.innerHTML = '<p class="no-data-message">Dữ liệu về bài hát bạn thường nghe sẽ xuất hiện ở đây.</p>';
        return;
    }
    const topSongs = sortedSongIds.map(([id]) => allFetchedSongs.find(song => song.id == id)).filter(song => song);
    topSongs.forEach(song => {
        mostPlayedContainer.appendChild(createIndexSongCardElement(song));
    });
}

// --- CÁC HÀM LOGIC CHÍNH ---

async function checkLoginStatus() {
    const token = localStorage.getItem('jwtToken');
    let isLoggedInUser = false;
    if (token) {
        try {
            const decodedPayload = JSON.parse(atob(token.split('.')[1]));
            if (headerUsernameSpan) headerUsernameSpan.textContent = decodedPayload.user.username;
            if (loggedInNav) loggedInNav.style.display = 'flex';
            if (loggedOutNav) loggedOutNav.style.display = 'none';
            isLoggedInUser = true;
        } catch (e) {
            localStorage.removeItem('jwtToken');
            if (loggedInNav) loggedInNav.style.display = 'none';
            if (loggedOutNav) loggedOutNav.style.display = 'flex';
        }
    } else {
        if (loggedInNav) loggedInNav.style.display = 'none';
        if (loggedOutNav) loggedOutNav.style.display = 'flex';
    }

    await fetchAllSongs();

    if (isLoggedInUser) {
        if (personalizedSections) personalizedSections.style.display = 'block';
        displayRecentlyPlayed();
        displayMostPlayed();
    } else {
        if (personalizedSections) personalizedSections.style.display = 'none';
    }

    renderAllSongsOnIndex(allFetchedSongs);
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        window.location.reload();
    });
}

function renderAllSongsOnIndex(songsToRender) {
    if (!songsContainer) return;
    songsContainer.innerHTML = '';
    if (!songsToRender || songsToRender.length === 0) {
        if (searchInput && searchInput.value.trim() !== "") {
            songsContainer.innerHTML = '<p>Không tìm thấy bài hát nào phù hợp.</p>';
        } else {
            songsContainer.innerHTML = '<p>Hiện tại chưa có bài hát nào trong hệ thống.</p>';
        }
        return;
    }
    songsToRender.forEach(song => {
        songsContainer.appendChild(createIndexSongCardElement(song));
    });
}

async function fetchAllSongs() {
    if (allFetchedSongs.length > 0) return;
    try {
        const response = await fetch(`${API_BASE_URL}/songs`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allFetchedSongs = await response.json();
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài hát:', error);
        if (songsContainer) songsContainer.innerHTML = '<p class="error">Không thể tải danh sách bài hát.</p>';
    }
}

/**
 * HÀM XỬ LÝ TÌM KIẾM: Lọc và hiển thị lại danh sách
 */
function handleSearchOnIndex() {
    if (!searchInput || !songsContainer) return;
    const query = searchInput.value.toLowerCase().trim();

     // Logic để ẩn/hiện các mục "Nghe gần đây" và "Thường nghe nhất"
    if (personalizedSections) {
        // Kiểm tra xem người dùng có đang đăng nhập không (dựa vào trạng thái của nav)
        const isLoggedIn = loggedInNav.style.display !== 'none';

        if (query) {
            // Nếu có từ khóa tìm kiếm, LUÔN LUÔN ẩn các mục cá nhân hóa
            personalizedSections.style.display = 'none';
        } else {
            // Nếu không có từ khóa (ô tìm kiếm trống),
            // hiển thị lại các mục cá nhân hóa CHỈ KHI người dùng đã đăng nhập.
            if (isLoggedIn) {
                personalizedSections.style.display = 'block';
            } else {
                personalizedSections.style.display = 'none';
            }
        }
    }

    // Lọc mảng allFetchedSongs dựa trên query
    const filteredSongs = allFetchedSongs.filter(song => {
        const titleMatch = song.title && song.title.toLowerCase().includes(query);
        const artistMatch = song.artist && song.artist.toLowerCase().includes(query);
        return titleMatch || artistMatch;
    });

    // Render lại danh sách chỉ với các bài hát đã được lọc
    // Các bài hát này khi được tạo lại vẫn có sự kiện click để chuyển trang
    renderAllSongsOnIndex(filteredSongs);
}

// --- GỌI HÀM KHI TẢI TRANG ---
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();

    // Gắn event listeners cho thanh tìm kiếm
    if (searchButton && searchInput) {
        // Tìm kiếm khi nhấn nút "Tìm"
        searchButton.addEventListener('click', handleSearchOnIndex);

        // Tìm kiếm khi nhấn phím Enter
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                handleSearchOnIndex();
            }
        });
        
        // **TÌM KIẾM TRỰC TIẾP KHI GÕ**
        // Sự kiện 'input' sẽ kích hoạt mỗi khi giá trị của ô input thay đổi
        searchInput.addEventListener('input', handleSearchOnIndex);
    }

    // Kiểm tra xem có đang ở trang Khám Phá không
    // Nếu tìm thấy phần tử #slidesContainer, có nghĩa là chúng ta đang ở trang khampha.html
    if (typeof initKhamphaPage === 'function') {
        initKhamphaPage();
    }
});