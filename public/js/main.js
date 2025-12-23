let currentVideoId = null;
let timeLeft = 15;
let timerInterval;
let isPaused = false;

const timerDisplay = document.getElementById('timer');
const container = document.getElementById('video-container');

// 1. دالة جلب الفيديو التالي
async function loadNextVideo() {
    try {
        const res = await fetch('/api/next-video');
        const data = await res.json();

        if (data.success) {
            currentVideoId = data.video._id;
            const tiktokUrl = data.video.url;
            const videoId = data.video.videoId; // سنحتاج لاستخراجه في السيرفر بشكل أدق

            // === تقنية الغسيل (Referrer Cloaking) ===
            // نستخدم Embed خاص بتيك توك لإخفاء المصدر
            const embedCode = `
                <iframe 
                    src="https://www.tiktok.com/embed/v2/${videoId}?lang=en-US"
                    style="width: 100%; height: 80vh; border: none;"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                    referrerpolicy="no-referrer"
                ></iframe>
            `;
            container.innerHTML = embedCode;

            // بدء العداد
            startTimer();

        } else {
            container.innerHTML = `<h2 class="text-white text-center mt-20">${data.message}</h2>`;
        }
    } catch (e) {
        console.error('Error loading video', e);
    }
}

// 2. منطق العداد
function startTimer() {
    timeLeft = 15; // المدة المطلوبة
    isPaused = false;
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (isPaused) return;

        timeLeft--;
        timerDisplay.innerText = `${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            claimReward();
        }
    }, 1000);
}

// 3. طلب المكافأة
async function claimReward() {
    timerDisplay.innerText = "💰 Claiming...";
    try {
        const res = await fetch('/api/reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: currentVideoId })
        });
        const data = await res.json();
        
        if (data.success) {
            // الانتقال للفيديو التالي
            setTimeout(loadNextVideo, 1000);
        }
    } catch (e) {
        console.error('Error claiming reward');
    }
}

// 4. شرطي التركيز (Focus Policeman)
document.addEventListener("visibilitychange", function() {
    if (document.hidden) {
        isPaused = true;
        document.title = "⚠️ توقف العداد!";
        timerDisplay.classList.add('text-red-500');
    } else {
        isPaused = false;
        document.title = "Hive Viewer 👁️";
        timerDisplay.classList.remove('text-red-500');
    }
});

// التشغيل الأول
loadNextVideo();
