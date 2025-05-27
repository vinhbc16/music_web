// public/js_fe/song_detail.js
const API_BASE_URL = 'http://localhost:5000/api';

// Lấy các phần tử DOM trên trang chi tiết bài hát
const detailPageTitle = document.getElementById('detailPageTitle');
const detailSongTitle = document.getElementById('detailSongTitle');
const detailSongArtist = document.getElementById('detailSongArtist');
const detailSongCover = document.getElementById('detailSongCover');
const detailAudioPlayer = document.getElementById('detailAudioPlayer');
const detailAudioSource = document.getElementById('detailAudioSource');
const detailSongGenre = document.getElementById('detailSongGenre');
const detailSongDescription = document.getElementById('detailSongDescription');
const relatedSongsContainer = document.getElementById('relatedSongsContainer');

// Hàm để lấy ID bài hát từ URL
function getSongIdFromUrl() {
    const pathSegments = window.location.pathname.split('/');
    // Giả sử URL có dạng /songs/ID
    if (pathSegments.length >= 3 && pathSegments[1] === 'songs') {
        const id = pathSegments[2];
        console.log('[LOG 1] getSongIdFromUrl - Extracted songId:', id);
        return id;
    }
    console.warn('[LOG 2] getSongIdFromUrl - Could not extract songId from path:', window.location.pathname);
    return null;
}

// Hàm để tải và hiển thị chi tiết bài hát
async function loadSongDetails() {
    const songId = getSongIdFromUrl();

    if (!songId) {
        alert('Không tìm thấy ID bài hát trong URL.');
        window.location.href = '/'; // Chuyển hướng về trang chủ
        return;
    }
    console.log(`[LOG 3] loadSongDetails - Attempting to load details for songId: ${songId}`);

    const urlToFetch = `${API_BASE_URL}/songs/${songId}`;
    console.log('[LOG 4] loadSongDetails - Fetching song data from URL:', urlToFetch);

    try {
        const response = await fetch(urlToFetch);
        console.log('[LOG 5] loadSongDetails - Fetch response status:', response.status, 'ok:', response.ok, 'url:', response.url);

        if (!response.ok) {
            if (response.status === 404) {
                console.error(`[LOG 6] loadSongDetails - API returned 404 for ${urlToFetch}. Song not found.`);
                alert('Bài hát không tìm thấy từ API!');
                window.location.href = '/'; // Chuyển hướng về trang chủ
                return;
            }
            // For other non-ok statuses (e.g., 500)
            let errorText = '';
            try {
                errorText = await response.text(); // Try to get error text from response body
            } catch (e) {
                console.warn('Could not get error text from response body', e);
            }
            console.error(`[LOG 7] loadSongDetails - HTTP error! Status: ${response.status}. URL: ${urlToFetch}. Response text: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText || 'No error text'}`);
        }
        const song = await response.json();
        console.log('[LOG 8] loadSongDetails - Successfully fetched song data:', song);

        // Cập nhật các phần tử trên trang
        detailPageTitle.textContent = `${song.title} - ${song.artist}`;
        detailSongTitle.textContent = song.title;
        detailSongArtist.textContent = song.artist;

        const coverArtUrl = song.cover_art_url ? `http://localhost:5000${song.cover_art_url}` : 'https://via.placeholder.com/300?text=No+Cover';
        console.log('[LOG 9] loadSongDetails - Setting cover art URL:', coverArtUrl);
        detailSongCover.src = coverArtUrl;
        detailSongCover.alt = `${song.title} Cover`;
        detailSongCover.onerror = () => { // Bắt lỗi tải ảnh bìa
            console.error('[LOG 9a] loadSongDetails - Failed to load cover art image from:', coverArtUrl);
            detailSongCover.src = 'https://via.placeholder.com/300?text=Image+Load+Error'; // Fallback image
        };


        const musicFileUrl = `http://localhost:5000${song.file_path}`;
        console.log('[LOG 10] loadSongDetails - Setting music file URL:', musicFileUrl);
        detailAudioSource.src = musicFileUrl;
        detailAudioPlayer.load(); // Tải lại audio để áp dụng src mới
        // detailAudioPlayer.play(); // Tạm thời tắt tự động phát để kiểm tra lỗi tải file

        detailAudioSource.onerror = () => { // Bắt lỗi tải file audio
            console.error('[LOG 10a] loadSongDetails - Failed to load audio source from:', musicFileUrl);
            alert(`Không thể tải file nhạc: ${musicFileUrl}. Vui lòng kiểm tra đường dẫn và file trên server.`);
        };
        detailAudioPlayer.addEventListener('error', (e) => {
            console.error('[LOG 10b] loadSongDetails - Audio player error:', e);
            let mediaError = e.target.error;
            if (mediaError) {
                 console.error(`MediaError code: ${mediaError.code}, message: ${mediaError.message}`);
            }
        });


        detailSongGenre.textContent = song.genre || 'Không xác định';
        detailSongDescription.textContent = song.description || 'Chưa có mô tả.';

        // Tải các bài hát liên quan
        await fetchSongsForRelatedSection();

    } catch (error) {
        console.error('[LOG 11] Lỗi nghiêm trọng khi tải chi tiết bài hát:', error.message, error.stack);
        alert('Không thể tải chi tiết bài hát. Vui lòng kiểm tra console để biết thêm chi tiết.');
        // window.location.href = '/'; // Cân nhắc không redirect ngay để xem console
    }
}

// Hàm tải tất cả bài hát để hiển thị "bài hát liên quan"
async function fetchSongsForRelatedSection() {
    const urlToFetchRelated = `${API_BASE_URL}/songs`;
    console.log('[LOG 12] fetchSongsForRelatedSection - Fetching related songs from URL:', urlToFetchRelated);
    try {
        const response = await fetch(urlToFetchRelated);
        console.log('[LOG 13] fetchSongsForRelatedSection - Fetch response status:', response.status, 'ok:', response.ok);
        if (!response.ok) {
            let errorText = '';
            try { errorText = await response.text(); } catch(e){}
            console.error(`[LOG 14] fetchSongsForRelatedSection - HTTP error! Status: ${response.status}. URL: ${urlToFetchRelated}. Response text: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText || 'No error text'}`);
        }
        const allSongs = await response.json();
        console.log('[LOG 15] fetchSongsForRelatedSection - Successfully fetched all songs for related section, count:', allSongs.length);

        const currentSongIdStr = getSongIdFromUrl();
        if (!currentSongIdStr) {
            console.warn('[LOG 16] fetchSongsForRelatedSection - Could not get currentSongId to filter related songs.');
            renderRelatedSongs([]);
            return;
        }
        const currentSongId = parseInt(currentSongIdStr);

        const relatedSongs = allSongs.filter(song => song.id !== currentSongId).slice(0, 6);
        console.log('[LOG 17] fetchSongsForRelatedSection - Filtered related songs:', relatedSongs.length > 0 ? relatedSongs : 'No related songs found after filter.');
        renderRelatedSongs(relatedSongs);
    } catch (error) {
        console.error('[LOG 18] Lỗi khi tải bài hát liên quan:', error.message, error.stack);
    }
}

// Hàm render các bài hát liên quan
function renderRelatedSongs(songs) {
    relatedSongsContainer.innerHTML = '';
    if (songs.length === 0) {
        relatedSongsContainer.innerHTML = '<p>Không có bài hát liên quan.</p>';
        return;
    }
    console.log('[LOG 19] renderRelatedSongs - Rendering related songs count:', songs.length);
    songs.forEach(song => {
        const relatedCard = document.createElement('div');
        relatedCard.classList.add('related-song-card');
        relatedCard.dataset.songId = song.id;

        const coverArtUrl = song.cover_art_url ? `http://localhost:5000${song.cover_art_url}` : 'https://via.placeholder.com/100?text=No+Cover';
        // Thêm onerror trực tiếp vào thẻ img để dễ debug hơn
        const imgHtml = `<img src="${coverArtUrl}" alt="${song.title} Cover" onerror="this.onerror=null; this.src='https://via.placeholder.com/100?text=Fail'; console.error('Failed to load related song cover: ${coverArtUrl} for song ID ${song.id}')">`;

        relatedCard.innerHTML = `
            ${imgHtml}
            <h4>${song.title}</h4>
            <p>${song.artist}</p>
        `;
        relatedCard.addEventListener('click', () => {
            if (song.id) {
                console.log(`[LOG 20] Navigating to related song ID: ${song.id}`);
                window.location.href = `/songs/${song.id}`;
            }
        });
        relatedSongsContainer.appendChild(relatedCard);
    });
}

// Chạy khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    console.log('[LOG 0] DOMContentLoaded - Page loaded, initializing song details.');
    loadSongDetails();
});