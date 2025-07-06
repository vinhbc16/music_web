// =================================================================
// PHẦN 1: KHAI BÁO BIẾN VÀ LẤY CÁC PHẦN TỬ DOM
// =================================================================

// --- CÁC BIẾN VÀ PHẦN TỬ DOM GỐC CỦA BẠN ---
const API_BASE_URL = 'http://localhost:5000/api';
const SERVER_ORIGIN = 'http://localhost:5000';

const detailPageTitle = document.getElementById('detailPageTitle');
const detailSongTitle = document.getElementById('detailSongTitle');
const detailSongArtist = document.getElementById('detailSongArtist');
const detailSongCover = document.getElementById('detailSongCover');
const detailAudioPlayer = document.getElementById('detailAudioPlayer');
const detailAudioSource = document.getElementById('detailAudioSource');
const detailSongGenre = document.getElementById('detailSongGenre');
const detailSongDescription = document.getElementById('detailSongDescription');
const relatedSongsContainer = document.getElementById('relatedSongsContainer');
const favoriteBtn = document.getElementById('favoriteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const commentsListContainer = document.getElementById('commentsListContainer');
const commentForm = document.getElementById('commentForm');
const commentTextTextarea = document.getElementById('commentText');
const submitCommentBtn = document.getElementById('submitCommentBtn');
const loginPromptCommentDiv = document.getElementById('loginPromptComment');

// --- CÁC PHẦN TỬ DOM MỚI CHO TÍNH NĂNG MỚI ---
const loopBtn = document.getElementById('loopBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeIcon = document.getElementById('volumeIcon');

// --- CÁC BIẾN QUẢN LÝ TRẠNG THÁI ---
let currentSongDetails = null;
let allSongsForShuffle = []; // Mảng chứa tất cả bài hát để phát ngẫu nhiên
let isShuffleOn = false;    // Trạng thái nút phát ngẫu nhiên


// =================================================================
// PHẦN 2: CÁC HÀM CHỨC NĂNG
// =================================================================

// --- CÁC HÀM GỐC CỦA BẠN (GIỮ NGUYÊN) ---

function getSongIdFromUrl() {
    const pathSegments = window.location.pathname.split('/');
    if (pathSegments.length >= 3 && pathSegments[1] === 'songs') {
        return pathSegments[2];
    }
    console.warn('[LOG 2] getSongIdFromUrl - Could not extract songId from path:', window.location.pathname);
    return null;
}

function isLoggedIn() {
    return localStorage.getItem('jwtToken') !== null;
}

async function checkFavoriteStatus(songId) {
    if (!isLoggedIn()) return false;
    const favorites = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');
    return favorites.includes(songId.toString());
}

function updateFavoriteButtonUI(isFavorited) {
    if (!favoriteBtn) return;
    if (isFavorited) {
        favoriteBtn.classList.add('favorited');
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Đã thích';
    } else {
        favoriteBtn.classList.remove('favorited');
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Yêu thích';
    }
    favoriteBtn.disabled = !isLoggedIn();
}

async function toggleFavoriteStatus() {
    if (!isLoggedIn() || !currentSongDetails || !currentSongDetails.id) {
        alert('Bạn cần đăng nhập để sử dụng tính năng này.');
        return;
    }
    const songId = currentSongDetails.id.toString();
    let favorites = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');
    const isCurrentlyFavorited = favorites.includes(songId);

    if (isCurrentlyFavorited) {
        favorites = favorites.filter(id => id !== songId);
    } else {
        favorites.push(songId);
    }
    localStorage.setItem('favoriteSongs', JSON.stringify(favorites));
    updateFavoriteButtonUI(!isCurrentlyFavorited);
}

function sanitizeFilename(filename) {
    if (!filename) return 'download';
    return filename.replace(/[^\w\s.-]/g, '_').replace(/\s+/g, '_');
}

function formatTimestamp(isoTimestamp) {
    if (!isoTimestamp) return 'Không rõ thời gian';
    try {
        const date = new Date(isoTimestamp);
        if (isNaN(date.getTime())) return 'Thời gian không hợp lệ';
        return date.toLocaleString('vi-VN', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting timestamp:", isoTimestamp, e);
        return 'Lỗi định dạng thời gian';
    }
}

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            "'": '&#39;', '"': '&quot;'
        }[tag] || tag)
    );
}

function renderComments(comments) {
    // ... (Giữ nguyên code gốc của bạn)
    if (!commentsListContainer) return;
    commentsListContainer.innerHTML = '';
    if (!comments || comments.length === 0) {
        commentsListContainer.innerHTML = '<p>Chưa có bình luận nào cho bài hát này.</p>';
        return;
    }
    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.classList.add('comment-item');
        if (comment.parent_comment_id) commentItem.classList.add('comment-reply');
        commentItem.innerHTML = `<p class="comment-author"><strong>${escapeHTML(comment.username)}</strong></p><p class="comment-timestamp"><em>${formatTimestamp(comment.created_at)}</em></p><p class="comment-content">${escapeHTML(comment.content)}</p>`;
        commentsListContainer.appendChild(commentItem);
    });
}

async function fetchComments(songId) {
    // ... (Giữ nguyên code gốc của bạn)
    if (!songId || !commentsListContainer) return;
    commentsListContainer.innerHTML = '<p>Đang tải bình luận...</p>';
    try {
        const response = await fetch(`${API_BASE_URL}/songs/${songId}/comments`);
        if (!response.ok) throw new Error('Failed to fetch comments');
        const comments = await response.json();
        renderComments(comments);
    } catch (error) {
        console.error('Lỗi tải bình luận:', error);
        commentsListContainer.innerHTML = '<p>Không thể tải bình luận.</p>';
    }
}

async function handlePostComment(event) {
    // ... (Giữ nguyên code gốc của bạn)
    event.preventDefault();
    if (!currentSongDetails || !isLoggedIn()) { alert('Bạn cần đăng nhập để bình luận.'); return; }
    const content = commentTextTextarea.value.trim();
    if (!content) { alert('Nội dung không được để trống.'); return; }
    const token = localStorage.getItem('jwtToken');
    if (!token) { alert('Lỗi xác thực.'); return; }
    submitCommentBtn.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/songs/${currentSongDetails.id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ content, parent_comment_id: null })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.msg || 'Lỗi gửi bình luận');
        }
        commentTextTextarea.value = '';
        await fetchComments(currentSongDetails.id);
    } catch (error) {
        console.error('Lỗi gửi bình luận:', error);
        alert(`Lỗi: ${error.message}`);
    } finally {
        submitCommentBtn.disabled = false;
    }
}

function renderRelatedSongs(songs) {
    // ... (Giữ nguyên code gốc của bạn)
    if(!relatedSongsContainer) return;
    relatedSongsContainer.innerHTML = '';
    if (songs.length === 0) return;
    songs.forEach(song => {
        const relatedCard = document.createElement('div');
        relatedCard.className = 'related-song-card';
        relatedCard.dataset.songId = song.id;
        const coverArtUrl = song.cover_art_url ? `${SERVER_ORIGIN}${song.cover_art_url}` : 'https://via.placeholder.com/100?text=...';
        relatedCard.innerHTML = `<img src="${coverArtUrl}" alt="${escapeHTML(song.title)}"><h4>${escapeHTML(song.title)}</h4><p>${escapeHTML(song.artist)}</p>`;
        relatedCard.addEventListener('click', () => { window.location.href = `/songs/${song.id}`; });
        relatedSongsContainer.appendChild(relatedCard);
    });
}


// --- HÀM MỚI VÀ HÀM ĐƯỢC CẬP NHẬT ---

/**
 * [HÀM MỚI] Chuyển đến một bài hát ngẫu nhiên khác bài hiện tại
 */
function playRandomSong() {
    if (!allSongsForShuffle || allSongsForShuffle.length < 2) {
        console.log("Không đủ bài hát để phát ngẫu nhiên.");
        return;
    }
    const currentSongId = getSongIdFromUrl();
    const availableSongs = allSongsForShuffle.filter(song => song.id != currentSongId);
    if (availableSongs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    const randomSong = availableSongs[randomIndex];
    window.location.href = `/songs/${randomSong.id}`;
}

/**
 * [HÀM CẬP NHẬT] Tải tất cả bài hát để dùng cho cả "Shuffle" và "Related"
 */
async function fetchAllSongsForShuffleAndRelated() {
    if(!relatedSongsContainer) return;
    try {
        const response = await fetch(`${API_BASE_URL}/songs`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const allSongs = await response.json();
        
        // LƯU LẠI DANH SÁCH CHO SHUFFLE
        allSongsForShuffle = allSongs; 

        // TIẾP TỤC LOGIC RENDER BÀI HÁT LIÊN QUAN
        const currentSongIdStr = getSongIdFromUrl();
        if (!currentSongIdStr) {
            renderRelatedSongs([]);
            return;
        }
        const currentSongIdNum = parseInt(currentSongIdStr);
        const relatedSongs = allSongs.filter(song => song.id !== currentSongIdNum).slice(0, 6);
        renderRelatedSongs(relatedSongs);
    } catch (error) {
        console.error('Lỗi khi tải bài hát liên quan:', error);
        relatedSongsContainer.innerHTML = "<p>Lỗi tải bài hát liên quan.</p>";
    }
}


/**
 * [HÀM GỐC] Hàm chính tải chi tiết bài hát, được cập nhật nhẹ
 */
async function loadSongDetails() {
    const songId = getSongIdFromUrl();
    if (!songId) {
        alert('Không tìm thấy ID bài hát trong URL.');
        window.location.href = '/';
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/songs/${songId}`);
        if (!response.ok) {
            // ... (xử lý lỗi như cũ)
            window.location.href = '/';
            return;
        }
        const song = await response.json();
        currentSongDetails = song;
        
        // --- Cập nhật UI (như code gốc) ---
        if (detailPageTitle) detailPageTitle.textContent = `${song.title} - ${song.artist}`;
        if (detailSongTitle) detailSongTitle.textContent = song.title;
        if (detailSongArtist) detailSongArtist.textContent = song.artist;
        const coverArtUrl = song.cover_art_url ? `${SERVER_ORIGIN}${song.cover_art_url}` : 'https://via.placeholder.com/300?text=No+Cover';
        if (detailSongCover) detailSongCover.src = coverArtUrl;
        const musicFileUrl = song.file_path ? `${SERVER_ORIGIN}${song.file_path}` : null;
        if (musicFileUrl) {
            if (detailAudioSource) detailAudioSource.src = musicFileUrl;
            if (detailAudioPlayer) detailAudioPlayer.load();
            if (downloadBtn) {
                downloadBtn.href = musicFileUrl;
                downloadBtn.setAttribute('download', `${sanitizeFilename(song.title)}.mp3`);
                downloadBtn.classList.remove('disabled');
            }
        }
        if (detailSongGenre) detailSongGenre.textContent = song.genre || 'Không xác định';
        if (detailSongDescription) detailSongDescription.textContent = song.description || 'Chưa có mô tả.';
        if (isLoggedIn()) {
            if (favoriteBtn) {
                favoriteBtn.disabled = false;
                const isFavorited = await checkFavoriteStatus(song.id);
                updateFavoriteButtonUI(isFavorited);
            }
            if (commentForm) commentForm.style.display = 'block';
            if (loginPromptCommentDiv) loginPromptCommentDiv.style.display = 'none';
        } else {
             if (favoriteBtn) favoriteBtn.disabled = true;
             if (commentForm) commentForm.style.display = 'none';
             if (loginPromptCommentDiv) loginPromptCommentDiv.style.display = 'block';
        }
        
        // --- Gọi hàm đã được cập nhật ---
        await fetchAllSongsForShuffleAndRelated();
        await fetchComments(songId);

    } catch (error) {
        console.error('Lỗi nghiêm trọng khi tải chi tiết bài hát:', error);
        alert('Không thể tải chi tiết bài hát.');
    }
}


// =================================================================
// PHẦN 3: GẮN CÁC SỰ KIỆN KHI TRANG TẢI XONG
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // GỌI HÀM GỐC
    loadSongDetails();

    // GẮN SỰ KIỆN CHO CÁC NÚT GỐC
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavoriteStatus);
    }
    if (commentForm) {
        commentForm.addEventListener('submit', handlePostComment);
    }
    
    // --- LOGIC MỚI CHO CÁC NÚT ĐIỀU KHIỂN MỚI ---

    // 1. Nút Lặp lại (Loop)
    if (loopBtn && detailAudioPlayer) {
        loopBtn.addEventListener('click', () => {
            detailAudioPlayer.loop = !detailAudioPlayer.loop;
            loopBtn.classList.toggle('active', detailAudioPlayer.loop);
            // Nếu bật loop, tắt shuffle để tránh xung đột
            if (detailAudioPlayer.loop && shuffleBtn) {
                isShuffleOn = false;
                shuffleBtn.classList.remove('active');
            }
        });
    }

    // 2. Nút Ngẫu nhiên (Shuffle)
    if (shuffleBtn && detailAudioPlayer) {
        shuffleBtn.addEventListener('click', () => {
            isShuffleOn = !isShuffleOn;
            shuffleBtn.classList.toggle('active', isShuffleOn);
            // Nếu bật shuffle, tắt loop
            if (isShuffleOn && loopBtn) {
                detailAudioPlayer.loop = false;
                loopBtn.classList.remove('active');
            }
        });
    }

    // 3. Thanh Âm lượng (Volume Slider)
    if (volumeSlider && detailAudioPlayer) {
        volumeSlider.addEventListener('input', (e) => {
            detailAudioPlayer.volume = e.target.value;
            detailAudioPlayer.muted = false;
        });
        
        detailAudioPlayer.addEventListener('volumechange', () => {
            if (detailAudioPlayer.muted || detailAudioPlayer.volume === 0) {
                if (volumeIcon) volumeIcon.classList.replace('fa-volume-high', 'fa-volume-xmark');
                volumeSlider.value = 0;
            } else {
                if (volumeIcon) volumeIcon.classList.replace('fa-volume-xmark', 'fa-volume-high');
                volumeSlider.value = detailAudioPlayer.volume;
            }
        });
    }
    
    // 4. Icon Âm lượng (Mute/Unmute)
    if (volumeIcon && detailAudioPlayer) {
        volumeIcon.addEventListener('click', () => {
            detailAudioPlayer.muted = !detailAudioPlayer.muted;
        });
    }

    // 5. Sự kiện kết thúc bài hát (để xử lý shuffle)
    if (detailAudioPlayer) {
        detailAudioPlayer.addEventListener('ended', () => {
            if (!detailAudioPlayer.loop && isShuffleOn) {
                playRandomSong();
            }
            else if (!detailAudioPlayer.loop && !isShuffleOn) {
                // === LOGIC MỚI CHO TỰ ĐỘNG CHUYỂN BÀI ===
                // Lấy bài hát đầu tiên trong danh sách "Các bài hát khác"
                const firstRelatedSong = document.querySelector('.related-song-card');
                if (firstRelatedSong) {
                    // Lấy songId và chuyển trang
                    const nextSongId = firstRelatedSong.dataset.songId;
                    window.location.href = `/songs/${nextSongId}`;
                }
            }
        });
    }
});