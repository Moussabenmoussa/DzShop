
let currentVideoId = null;
let timeLeft = 15;
let timerInterval;
let isPaused = false;

const timerDisplay = document.getElementById('timer');
const container = document.getElementById('video-container');

// === أدوات استخراج المعرفات (جزء الإصلاح الضروري) ===
function getTikTokID(url) {
    if (!url) return null;
    const match = url.match(/video\/(\d+)/);
    return match ? match[1] : null;
}

function getYouTubeID(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/))([^?&]+)/);
    return match ? match[1] : null;
}

// 1. دالة جلب وعرض الفيديو
async function loadNextVideo() {
    try {
        const res = await fetch('/api/next-video');
        const data = await res.json();

        if (data.success) {
            currentVideoId = data.video._id;
            const videoUrl = data.video.url;
            
            // --- السر الأول: إخفاء المصدر (Referrer Cloaking) ---
            // نستخدم referrerpolicy="no-referrer" لمنع تتبع المصدر
            
            if (videoUrl.includes('youtu')) {
                const ytId = getYouTubeID(videoUrl);
                container.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0" 
                    style="width: 100%; height: 80vh; border: none;" 
                    allow="autoplay"
                    referrerpolicy="no-referrer"></iframe>`; // <--- هنا السر
                startTimer();

            } else if (videoUrl.includes('tiktok')) {
                const tkId = getTikTokID(videoUrl);

                if (tkId) {
                    // تشغيل مباشر (للموبايل والكمبيوتر)
                    container.innerHTML = `
                        <iframe 
                            src="https://www.tiktok.com/embed/v2/${tkId}?lang=en-US"
                            style="width: 100%; height: 80vh; border: none;"
                            allow="encrypted-media;"
                            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                            referrerpolicy="no-referrer"
                        ></iframe>
                    `; // <--- هنا السر (Sandbox + No Referrer)
                    startTimer();
                } else {
                    // حل مشكلة الروابط المختصرة
                    container.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-64 text-center px-4 mt-20">
                            <p class="mb-6 text-xl text-white">⚠️ رابط مختصر (حماية تيك توك)</p>
                            <a href="${videoUrl}" target="_blank" onclick="startTimer()" 
                               class="bg-pink-500 hover:bg-pink-600 text-white px-8 py-4 rounded-full font-bold text-lg animate-bounce">
                                🎵 اضغط للمشاهدة واحتساب النقاط
                            </a>
                        </div>
                    `;
                }
            }
        } else {
            container.innerHTML = `<h2 class="text-white text-center mt-20">${data.message}</h2>`;
            timerDisplay.innerText = "--";
        }
    } catch (e) {
        console.error('Error', e);
    }
}

// 2. العداد
function startTimer() {
    timeLeft = 15;
    isPaused = false;
    clearInterval(timerInterval);
    
    timerDisplay.classList.remove('text-red-500');
    timerDisplay.classList.add('text-green-400');

    timerInterval = setInterval(() => {
        if (isPaused) return; // العداد متوقف إذا غش المستخدم

        timeLeft--;
        timerDisplay.innerText = `00:${timeLeft < 10 ? '0' + timeLeft : timeLeft}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            claimReward();
        }
    }, 1000);
}

// 3. المكافأة
async function claimReward() {
    timerDisplay.innerText = "💰 ...";
    try {
        const res = await fetch('/api/reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: currentVideoId })
        });
        const data = await res.json();
        if (data.success) {
            setTimeout(loadNextVideo, 1000);
        }
    } catch (e) { console.error(e); }
}

// 4. === السر الثاني: شرطي التركيز (Focus Policeman) ===
// يراقب ما إذا كان المستخدم غادر الصفحة
document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
        isPaused = true; // كشف الغش: إيقاف العداد
        document.title = "⚠️ عد فوراً!";
        timerDisplay.classList.add('text-red-500'); // تحذير أحمر
        timerDisplay.classList.remove('text-green-400');
    } else {
        isPaused = false; // استئناف
        document.title = "Hive Viewer 👁️";
        timerDisplay.classList.remove('text-red-500');
        timerDisplay.classList.add('text-green-400');
    }
});

loadNextVideo();
