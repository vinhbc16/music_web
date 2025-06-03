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

// Lấy các phần tử DOM cho thanh tìm kiếm
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

let allFetchedSongs = []; // Biến để lưu trữ tất cả bài hát đã fetch

// Hàm kiểm tra trạng thái đăng nhập và cập nhật UI
async function checkLoginStatus() {
    const token = localStorage.getItem('jwtToken');
    if (token) {
        try {
            const payloadBase64 = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payloadBase64));
            
            headerUsernameSpan.textContent = decodedPayload.user.username;
            loggedInNav.style.display = 'flex'; // Sử dụng flex để căn chỉnh tốt hơn
            loggedOutNav.style.display = 'none';
            userDashboard.style.display = 'block';
            songsSection.style.display = 'block'; 
            await fetchSongs(); // Fetch và hiển thị danh sách bài hát
        } catch (e) {
            console.error("Lỗi giải mã token hoặc token không hợp lệ:", e);
            localStorage.removeItem('jwtToken');
            loggedInNav.style.display = 'none';
            loggedOutNav.style.display = 'flex'; // Sử dụng flex
            userDashboard.style.display = 'none';
            songsSection.style.display = 'block';
            await fetchSongs(); 
        }
    } else {
        loggedInNav.style.display = 'none';
        loggedOutNav.style.display = 'flex'; // Sử dụng flex
        userDashboard.style.display = 'none';
        songsSection.style.display = 'block';
        await fetchSongs();
    }
}

// Hàm render danh sách bài hát
function renderSongs(songsToRender) {
    songsContainer.innerHTML = ''; // Xóa các bài hát cũ

    if (!songsToRender || songsToRender.length === 0) {
        // Kiểm tra xem có query tìm kiếm không để hiển thị thông báo phù hợp
        if (searchInput.value.trim() !== "" && allFetchedSongs.length > 0) {
            songsContainer.innerHTML = '<p>Không tìm thấy bài hát nào phù hợp với tìm kiếm của bạn.</p>';
        } else if (allFetchedSongs.length === 0 && searchInput.value.trim() === "") {
            // Trường hợp này là khi ban đầu không có bài hát nào từ API
             songsContainer.innerHTML = '<p>Chưa có bài hát nào trong danh sách.</p>';
        } else if (searchInput.value.trim() === "" && allFetchedSongs.length > 0) {
            // Nếu ô tìm kiếm trống và có bài hát, nhưng songsToRender lại rỗng (trường hợp này ít xảy ra trừ khi có lỗi logic)
            //  Hiển thị lại toàn bộ danh sách nếu không có gì để render nhưng có bài hát gốc
            allFetchedSongs.forEach(createAndAppendSongCard);

        }
         else {
            songsContainer.innerHTML = '<p>Chưa có bài hát nào để hiển thị.</p>';
        }
        return;
    }

    songsToRender.forEach(createAndAppendSongCard);
}

// Hàm tạo và gắn card bài hát (tách ra để tái sử dụng)
function createAndAppendSongCard(song) {
    const songCard = document.createElement('div');
    songCard.classList.add('song-card');
    songCard.dataset.songId = song.id;
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

    // Gắn lại event listener cho card mới tạo (nếu cần thiết phải làm ở đây)
    // Tuy nhiên, cách tiếp cận tốt hơn là ủy quyền sự kiện hoặc gắn sau khi tất cả card đã được render
    // Trong code gốc, event listener được gắn sau khi forEach hoàn tất, điều đó là ổn.
    // Để giữ nguyên cấu trúc, chúng ta sẽ gắn listener trong `renderSongs` sau vòng lặp.
    // Nhưng vì chúng ta đã gọi `createAndAppendSongCard` trong vòng lặp, nên sẽ gắn ở ngoài sau khi renderSongs xong.
    // Hoặc, nếu bạn muốn giữ listener ở đây, thì cần đảm bảo nó không bị gắn nhiều lần nếu có render lại.

    // Để đơn giản, giữ cách gắn listener sau khi toàn bộ DOM đã được cập nhật trong `renderSongs` hoặc 1 hàm riêng
}


// Cập nhật hàm renderSongs để gắn event listener sau khi tất cả card được thêm vào DOM
function renderSongs(songsToRender) {
    songsContainer.innerHTML = ''; // Xóa các bài hát cũ

    if (!songsToRender || songsToRender.length === 0) {
        if (searchInput.value.trim() !== "" && allFetchedSongs.length > 0) {
            songsContainer.innerHTML = '<p>Không tìm thấy bài hát nào phù hợp với tìm kiếm của bạn.</p>';
        } else if (allFetchedSongs.length === 0 && searchInput.value.trim() === "") {
            songsContainer.innerHTML = '<p>Hiện tại chưa có bài hát nào trong hệ thống.</p>';
        } else {
            // Nếu không có query tìm kiếm, và allFetchedSongs có bài hát, thì không nên vào đây trừ khi có lỗi
            // Hoặc là khi fetch ban đầu không có bài hát
             songsContainer.innerHTML = '<p>Chưa có bài hát nào trong danh sách.</p>';
        }
        return;
    }

    songsToRender.forEach(song => { // Giờ hàm createAndAppendSongCard chỉ tạo và thêm, không gắn listener
        const songCard = document.createElement('div');
        songCard.classList.add('song-card');
        songCard.dataset.songId = song.id; 
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

    // Gắn event listeners cho tất cả các song card vừa được render
    document.querySelectorAll('.clickable-song-card').forEach(card => {
        card.addEventListener('click', (event) => {
            if (event.target.tagName === 'AUDIO' || event.target.tagName === 'SOURCE' || event.target.closest('audio')) {
                console.log('[INDEX.JS] Click vào audio player, không điều hướng.');
                return; 
            }
            const songId = card.dataset.songId;
            if (songId && String(songId).trim() !== "") {
                window.location.href = `/songs/${songId}`; // Đảm bảo route này tồn tại ở backend nếu bạn muốn xem chi tiết bài hát
                // Hoặc nếu bạn muốn làm gì khác khi click vào bài hát (ví dụ: phát nhạc trong một player cố định)
                // thì xử lý ở đây.
            } else {
                console.error('[INDEX.JS] songId không hợp lệ hoặc rỗng:', songId);
                alert('Lỗi: ID bài hát không hợp lệ.');
            }
        });
    });
}


// Hàm fetch danh sách bài hát từ Backend
async function fetchSongs() {
    try {
        const response = await fetch(`${API_BASE_URL}/songs`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const songs = await response.json();
        allFetchedSongs = songs; // Lưu lại tất cả bài hát
        renderSongs(allFetchedSongs); // Hiển thị tất cả bài hát ban đầu
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài hát:', error);
        songsContainer.innerHTML = '<p class="error">Không thể tải danh sách bài hát. Vui lòng thử lại sau.</p>';
        allFetchedSongs = []; // Đặt lại nếu có lỗi
    }
}

// Hàm xử lý tìm kiếm
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        renderSongs(allFetchedSongs); // Nếu query rỗng, hiển thị tất cả bài hát
        return;
    }

    const filteredSongs = allFetchedSongs.filter(song => {
        const titleMatch = song.title.toLowerCase().includes(query);
        const artistMatch = song.artist.toLowerCase().includes(query);
        return titleMatch || artistMatch;
    });

    renderSongs(filteredSongs); // Hiển thị các bài hát đã lọc
}

// Gắn Event Listeners cho thanh tìm kiếm
searchButton.addEventListener('click', handleSearch);

searchInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
        handleSearch();
    }
    // Để có "live search" (tìm kiếm ngay khi gõ), bạn có thể bỏ comment dòng dưới
    // hoặc thêm debounce để tối ưu hiệu suất nếu danh sách lớn.
    // handleSearch(); 
});
// Thêm một listener cho sự kiện 'input' để xóa kết quả tìm kiếm nếu người dùng xóa hết text
searchInput.addEventListener('input', () => {
    if (searchInput.value.trim() === '') {
        renderSongs(allFetchedSongs); // Hiển thị lại tất cả bài hát nếu ô tìm kiếm trống
    }
});


// Xử lý nút Đăng xuất
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    allFetchedSongs = []; // Xóa cache bài hát khi đăng xuất
    searchInput.value = ''; // Xóa nội dung tìm kiếm
    checkLoginStatus(); 
});

// Gọi hàm kiểm tra trạng thái đăng nhập khi trang được tải
document.addEventListener('DOMContentLoaded', checkLoginStatus);