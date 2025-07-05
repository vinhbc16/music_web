// public/js_fe/khampha.js

// Hàm này sẽ được gọi bởi index.js khi ở trang khampha.html
function initKhamphaPage() {
    console.log("Hàm initKhamphaPage() đã được gọi!"); // Thêm log để kiểm tra

    // DOM Elements cho Banner Slider
    const slidesContainer = document.getElementById('slidesContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // DOM Elements cho các khu vực nhạc
    const vnSongsContainer = document.getElementById('vn-songs-container');
    const intlSongsContainer = document.getElementById('intl-songs-container');
    
    let currentIndex = 0;
    
    // --- Banner Slider Logic ---
    function updateSliderPosition() {
        if (slidesContainer) {
            slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
        }
    }

    // Khởi tạo Banner Slider
    const currentSlides = document.querySelectorAll('.banner-slider .slide');
    if (slidesContainer && prevBtn && nextBtn && currentSlides.length > 0) {
        const totalSlides = currentSlides.length;
        console.log("Tìm thấy " + totalSlides + " slides."); // Log kiểm tra
        slidesContainer.style.width = `${totalSlides * 100}%`;

        const showNextSlide = () => {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateSliderPosition();
        };

        const showPrevSlide = () => {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSliderPosition();
        };

        prevBtn.addEventListener('click', showPrevSlide);
        nextBtn.addEventListener('click', showNextSlide);

        setInterval(showNextSlide, 5000); // Tự động trượt
        updateSliderPosition();
    } else {
        console.error("Không thể khởi tạo banner. Một hoặc nhiều thành phần bị thiếu.");
    }

    // --- Music Fetching and Rendering Logic ---
    let allFetchedSongsExplore = [];

    function createSongCardExplore(song) {
        const songCard = document.createElement('div');
        songCard.classList.add('song-card');
        songCard.dataset.songId = song.id;

        const correctedCoverArtUrl = song.cover_art_url
            ? (song.cover_art_url.startsWith('http') ? song.cover_art_url : `http://localhost:5000${song.cover_art_url}`)
            : 'https://via.placeholder.com/200?text=No+Cover';

        const musicFileUrl = song.file_path
            ? (song.file_path.startsWith('http') ? song.file_path : `http://localhost:5000${song.file_path}`)
            : '#';

        songCard.innerHTML = `
            <img src="${correctedCoverArtUrl}" alt="${song.title || 'Song'} Cover" style="object-fit: cover;">
            <h3>${song.title || 'Chưa có tên'}</h3>
            <p>${song.artist || 'Nghệ sĩ không xác định'}</p>
            <audio controls class="audio-player" preload="none">
                <source src="${musicFileUrl}" type="audio/mpeg">
                Trình duyệt của bạn không hỗ trợ thẻ audio.
            </audio>
        `;

        songCard.addEventListener('click', (event) => {
            if (event.target.tagName === 'AUDIO' || event.target.closest('audio')) {
                return;
            }
            const songId = songCard.dataset.songId;
            if (songId) {
                window.location.href = `/songs/${songId}`;
            }
        });
        return songCard;
    }

    function renderSongSection(songsArray, containerElement) {
        if (!containerElement) return;
        containerElement.innerHTML = '';

        if (!songsArray || songsArray.length === 0) {
            containerElement.innerHTML = '<p>Không có bài hát nào trong mục này.</p>';
            return;
        }
        songsArray.forEach(song => {
            const songCard = createSongCardExplore(song);
            containerElement.appendChild(songCard);
        });
    }

    async function fetchAndDisplaySongs() {
        try {
            // API_BASE_URL đã được khai báo trong config.js hoặc index.js
            const response = await fetch(`${API_BASE_URL}/songs`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allFetchedSongsExplore = await response.json();

            const vnSongs = allFetchedSongsExplore.filter(song => song.nation && song.nation.toUpperCase() === 'VN');
            const intlSongs = allFetchedSongsExplore.filter(song => song.nation && (song.nation.toUpperCase() === 'US-UK' || song.nation.toUpperCase() === 'KPOP'));

            renderSongSection(vnSongs, vnSongsContainer);
            renderSongSection(intlSongs, intlSongsContainer);

        } catch (error) {
            console.error('Lỗi khi tải danh sách bài hát cho trang khám phá:', error);
            if (vnSongsContainer) vnSongsContainer.innerHTML = '<p class="error">Không thể tải nhạc Việt.</p>';
            if (intlSongsContainer) intlSongsContainer.innerHTML = '<p class="error">Không thể tải nhạc quốc tế.</p>';
        }
    }

    // --- Initialization ---
    fetchAndDisplaySongs();
}