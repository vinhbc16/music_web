// public/js_fe/playlists.js
const API_BASE_URL_PLAYLISTS = 'http://localhost:5000/api'; // Khai báo lại hoặc import từ file chung
const genrePlaylistsContainer = document.getElementById('genre-playlists-container');

// Hàm tạo card bài hát (có thể copy từ index.js hoặc tạo file utils chung)
function createPlaylistSongCard(song) {
    const songCard = document.createElement('div');
    songCard.classList.add('song-card');
    songCard.dataset.songId = song.id;
    songCard.classList.add('clickable-song-card');

    const coverArtUrl = song.cover_art_url
        ? (song.cover_art_url.startsWith('http') ? song.cover_art_url : `http://localhost:5000${song.cover_art_url}`)
        : 'https://via.placeholder.com/200?text=No+Cover';
    const musicFileUrl = song.file_path
        ? (song.file_path.startsWith('http') ? song.file_path : `http://localhost:5000${song.file_path}`)
        : '#';

    songCard.innerHTML = `
        <img src="${coverArtUrl}" alt="${song.title || 'Song'} Cover">
        <h3>${song.title || 'Chưa có tên'}</h3>
        <p>${song.artist || 'Nghệ sĩ không xác định'}</p>
        <audio controls class="audio-player" preload="none">
            <source src="${musicFileUrl}" type="audio/mpeg">
            Trình duyệt của bạn không hỗ trợ thẻ audio.
        </audio>
    `;
    return songCard;
}

// Hàm nhóm bài hát theo thể loại (di chuyển từ index.js)
function groupSongsByGenre(songs) {
    if (!songs || songs.length === 0) return {};
    return songs.reduce((acc, song) => {
        const genre = song.genre || 'Chưa xác định';
        if (!acc[genre]) {
            acc[genre] = [];
        }
        acc[genre].push(song);
        return acc;
    }, {});
}

// Hàm "chế" tiêu đề playlist dựa trên thể loại (di chuyển từ index.js)
function getPlaylistTitleForGenre(genre) {
    const titlesMap = {
        "Pop Ballad": "Giai Điệu Lãng Mạn: Pop Ballad",
        "Pop/R&B": "Nhịp Điệu Pop & R&B Quyến Rũ",
        "Rap/Hip-hop": "Đốt Cháy Đường Phố: Rap & Hip-Hop",
        "Pop": "Sôi Động Cùng Pop Hits Quốc Tế",
        "Rap/Drill": "Chất Drill Đường Phố",
        "Rap/Trap": "Trap Life: Giai Điệu Gây Nghiện",
        "Indie Pop/R&B": "Làn Gió Mới: Indie Pop/R&B Tinh Tế",
    };
    return titlesMap[genre] || `Playlist: ${genre}`;
}

// Hàm render các playlist theo thể loại vào container được chỉ định
function renderGenrePlaylistsToPage(groupedSongs, containerElement) {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    if (Object.keys(groupedSongs).length === 0) {
        containerElement.innerHTML = '<p>Không có playlist nào để hiển thị.</p>';
        return;
    }

    for (const genre in groupedSongs) {
        if (groupedSongs.hasOwnProperty(genre)) {
            const songsInGenre = groupedSongs[genre];
            if (songsInGenre.length > 0) {
                const playlistDiv = document.createElement('div');
                playlistDiv.classList.add('genre-playlist');

                const titleContainer = document.createElement('div');
                titleContainer.classList.add('genre-title-container');
                const playlistTitle = document.createElement('h2');
                playlistTitle.textContent = getPlaylistTitleForGenre(genre);
                titleContainer.appendChild(playlistTitle);
                playlistDiv.appendChild(titleContainer);

                const genreSongGrid = document.createElement('div');
                genreSongGrid.classList.add('song-grid');

                // Hiển thị TẤT CẢ bài hát trong thể loại đó, không giới hạn như trên trang chủ
                songsInGenre.forEach(song => {
                    const songCardEl = createPlaylistSongCard(song);
                    genreSongGrid.appendChild(songCardEl);
                });
                
                playlistDiv.appendChild(genreSongGrid);
                containerElement.appendChild(playlistDiv);

                // Gắn event listener cho các card trong playlist này
                const clickableCardsInPlaylist = genreSongGrid.querySelectorAll('.clickable-song-card');
                clickableCardsInPlaylist.forEach(card => {
                    card.addEventListener('click', (event) => {
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
        }
    }
}

// Hàm fetch tất cả bài hát và xử lý cho trang playlists
async function fetchAndDisplayPlaylists() {
    if (!genrePlaylistsContainer) {
        console.error("Container for genre playlists not found!");
        return;
    }
    genrePlaylistsContainer.innerHTML = '<p>Đang tải playlists...</p>'; // Thông báo tải ban đầu

    try {
        const response = await fetch(`${API_BASE_URL_PLAYLISTS}/songs`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const allSongs = await response.json();

        if (allSongs.length === 0) {
            genrePlaylistsContainer.innerHTML = '<p>Không có bài hát nào trong hệ thống để tạo playlist.</p>';
            return;
        }
        
        const groupedByGenre = groupSongsByGenre(allSongs);
        renderGenrePlaylistsToPage(groupedByGenre, genrePlaylistsContainer);

    } catch (error) {
        console.error('Lỗi khi tải hoặc xử lý playlists:', error);
        if (genrePlaylistsContainer) {
            genrePlaylistsContainer.innerHTML = '<p class="error">Không thể tải playlists. Vui lòng thử lại sau.</p>';
        }
    }
}

// Chạy khi DOM của trang playlists.html đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Hàm checkLoginStatus từ index.js (đã được include trong playlists.html)
    // sẽ tự động chạy và cập nhật header.
    
    // Gọi hàm để tải và hiển thị playlists theo thể loại
    fetchAndDisplayPlaylists();
});