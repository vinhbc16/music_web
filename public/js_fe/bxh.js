// public/js_fe/bxh.js

document.addEventListener('DOMContentLoaded', () => {
    // Hàm chính để khởi tạo trang BXH
    async function initBxhPage() {
        const playCounts = JSON.parse(localStorage.getItem('playCounts')) || {};
        
        if (Object.keys(playCounts).length === 0) {
            document.getElementById('rankedSongsList').innerHTML = '<p>Chưa có dữ liệu xếp hạng. Hãy nghe thêm nhạc nhé!</p>';
            const chartContainer = document.querySelector('.chart-container');
            if(chartContainer) chartContainer.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/songs`);
            if (!response.ok) throw new Error('Không thể tải danh sách bài hát');
            const allSongs = await response.json();

            const sortedSongIds = Object.keys(playCounts).sort((a, b) => playCounts[b] - playCounts[a]);

            const rankedSongs = sortedSongIds.map(id => {
                const songDetails = allSongs.find(song => song.id == id);
                if (!songDetails) return null;
                return {
                    ...songDetails,
                    play_count: playCounts[id]
                };
            }).filter(Boolean);

            renderRankedList(rankedSongs);
            renderChart(rankedSongs.slice(0, 10));

        } catch (error) {
            console.error("Lỗi khi khởi tạo trang BXH:", error);
            document.getElementById('rankedSongsList').innerHTML = '<p class="error">Đã xảy ra lỗi khi tải bảng xếp hạng.</p>';
        }
    }

    // Hàm render danh sách bài hát
    function renderRankedList(songs) {
        const listContainer = document.getElementById('rankedSongsList');
        listContainer.innerHTML = '';

        // *** DÒNG SỬA LỖI NẰM Ở ĐÂY ***
        const SERVER_ORIGIN = 'http://localhost:5000'; // Đường dẫn gốc của server

        songs.forEach((song, index) => {
            const rank = index + 1;
            const songItem = document.createElement('div');
            songItem.className = `song-list-item rank-${rank}`;
            
            // Sử dụng SERVER_ORIGIN thay vì API_BASE_URL
            const coverArtUrl = song.cover_art_url 
                ? `${SERVER_ORIGIN}${song.cover_art_url}`
                : 'https://via.placeholder.com/60?text=...';

            songItem.innerHTML = `
                <span class="rank-number">${rank}</span>
                <img src="${coverArtUrl}" alt="${song.title}" class="song-thumbnail">
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                </div>
                <div class="song-duration">
                    <i class="fas fa-headphones"></i> ${song.play_count.toLocaleString()} lượt nghe
                </div>
            `;
            
            songItem.querySelector('.song-info').addEventListener('click', () => {
                window.location.href = `/songs/${song.id}`;
            });

            listContainer.appendChild(songItem);
        });
    }

    // Hàm render đồ thị với Chart.js (giữ nguyên không đổi)
    function renderChart(topSongs) {
        const ctx = document.getElementById('bxhChart').getContext('2d');

        const labels = topSongs.map(song => song.title);
        const data = topSongs.map(song => song.play_count);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Lượt nghe',
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: 'rgba(75, 192, 192, 1)',
                    pointHoverRadius: 7,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: { size: 14 },
                        bodyFont: { size: 12 },
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                return `Lượt nghe: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(200, 200, 200, 0.2)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Chạy hàm khởi tạo
    initBxhPage();
});