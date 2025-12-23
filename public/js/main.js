let currentVideoId = null;
let timeLeft = 15;
let timerInterval;
let isPaused = false;
let isExternalMode = false; // هل الفيديو خارجي؟
let externalStartTime = 0;  // وقت الخروج للتطبيق

const timerDisplay = document.getElementById('timer');
const container = document.getElementById('video-container');

// أدوات استخراج المعرفات
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
        clearInterval(timerInterval); // تنظيف العدادات القديمة
        isExternalMode = false; // الوضع الافتراضي (داخلي)
        
        const res = await fetch('/api/next-video');
        const data = await res.json();

        if (data.success) {
            currentVideoId = data.video._id;
            const videoUrl = data.video.url;
            
            // === فحص النوع ===
            if (videoUrl.includes('youtu')) {
                // يوتيوب (داخلي)
                const ytId = getYouTubeID(videoUrl);
                container.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0" 
                    style="width: 100%; height: 80vh; border: none;" allow="autoplay" referrerpolicy="no-referrer"></iframe>`;
                startTimer();

            } else if (videoUrl.includes('tiktok')) {
                const tkId = getTikTokID(videoUrl);

                if (tkId) {
                    // تيك توك طويل (داخلي)
                    container.innerHTML = `
                        <iframe src="https://www.tiktok.com/embed/v2/${tkId}?lang=en-US"
                            style="width: 100%; height: 80vh; border: none;"
                            allow="encrypted-media;" referrerpolicy="no-referrer"></iframe>`;
                    startTimer();
                } else {
                    // === تيك توك مختصر (خارجي - هنا نطبق الحماية الجديدة) ===
                    isExternalMode = true; // تفعيل الوضع الخارجي
                    timerDisplay.innerText = "انتظار...";
                    
                    container.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-64 text-center px-4 mt-20">
                            <h2 class="text-xl font-bold text-white mb-4">فيديو خارجي</h2>
                            <p class="text-gray-300 mb-6">يجب مشاهدة 15 ثانية كاملة في التطبيق ثم العودة</p>
                            
                            <a id="external-btn" href="${videoUrl}" target="_blank" 
                               class="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-full font-bold text-lg animate-pulse shadow-lg border-2 border-pink-400">
                                🚀 اضغط للمشاهدة في تيك توك
                            </a>
                        </div>
                    `;

                    // تفعيل فخ الوقت عند الضغط
                    document.getElementById('external-btn').addEventListener('click', () => {
                        externalStartTime = Date.now(); // سجلنا وقت الخروج
                        timerDisplay.innerText = "جاري التحقق...";
                        timerDisplay.classList.add('text-yellow-400');
                    });
                }
            }
        } else {
            container.innerHTML = `<h2 class="text-white text-center mt-20">${data.message}</h2>`;
            timerDisplay.innerText = "--";
        }
    } catch (e) { console.error(e); }
}

// 2. العداد (للفيديوهات الداخلية فقط)
function startTimer() {
    timeLeft = 15;
    isPaused = false;
    timerDisplay.classList.remove('text-red-500', 'text-yellow-400');
    timerDisplay.classList.add('text-green-400');

    timerInterval = setInterval(() => {
        if (isPaused) return;

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
    timerDisplay.innerText = "💰 Claiming...";
    try {
        const res = await fetch('/api/reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: currentVideoId })
        });
        const data = await res.json();
        if (data.success) {
            // تأثير بصري للنجاح
            timerDisplay.innerText = "✅ تم!";
            setTimeout(loadNextVideo, 1500);
        }
    } catch (e) { console.error(e); }
}

// 4. === الحارس الذكي (Smart Guard) ===
document.addEventListener("visibilitychange", function() {
    // الحالة أ: فيديو داخلي (Iframe)
    if (!isExternalMode) {
        if (document.hidden) {
            isPaused = true;
            document.title = "⚠️ عد فوراً!";
            timerDisplay.classList.add('text-red-500');
        } else {
            isPaused = false;
            document.title = "Hive Viewer 👁️";
            timerDisplay.classList.remove('text-red-500');
        }
    } 
    // الحالة ب: فيديو خارجي (App) - هنا نكشف الغش
    else {
        if (!document.hidden && externalStartTime > 0) {
            // المستخدم عاد للصفحة.. لنحسب كم غاب
            const timeNow = Date.now();
            const timeSpent = (timeNow - externalStartTime) / 1000; // بالثواني

            if (timeSpent >= 15) {
                // نجاح: غاب أكثر من 15 ثانية
                externalStartTime = 0; // تصفير
                claimReward();
            } else {
                // فشل: عاد بسرعة (غش)
                externalStartTime = 0; // تصفير حتى يضغط مجدداً
                alert(`⛔ عدت بسرعة كبيرة! (${Math.floor(timeSpent)} ثانية فقط)\nيجب أن تشاهد الفيديو لمدة 15 ثانية كاملة.`);
                timerDisplay.innerText = "حاول مجدداً";
                timerDisplay.classList.remove('text-yellow-400');
                timerDisplay.classList.add('text-red-500');
            }
        }
    }
});

loadNextVideo();
