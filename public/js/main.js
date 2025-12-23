
let currentVideoId = null;
let timeLeft = 15;
let timerInterval;
let isPaused = false;
let isExternalMode = false;
let externalStartTime = 0;

const timerDisplay = document.getElementById('timer');
const container = document.getElementById('video-container');
const toastContainer = document.getElementById('toast-container');
const thunderModal = document.getElementById('thunder-modal');
const thunderTitle = document.getElementById('thunder-title');
const thunderMsg = document.getElementById('thunder-msg');
const thunderBtn = document.getElementById('thunder-btn');

// === نظام الأصوات ===
const sounds = {
    success: document.getElementById('sound-success'),
    error: document.getElementById('sound-error'),
    click: document.getElementById('sound-click')
};

function playSound(type) {
    if (sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].volume = 0.5;
        sounds[type].play().catch(e => console.log("Audio blocked"));
    }
}

// === دالة إظهار الإشعار (Toast) ===
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    let colors = type === 'success' ? 'border-green-500 bg-gray-900 text-green-400' : 
                 type === 'error' ? 'border-red-500 bg-gray-900 text-red-400' : 
                 'border-blue-500 bg-gray-900 text-blue-400';
    let icon = type === 'success' ? '💰' : type === 'error' ? '⛔' : 'ℹ️';

    toast.className = `${colors} border-l-4 p-4 rounded-r shadow-2xl flex items-center gap-3 transform translate-y-[-20px] opacity-0 transition-all duration-300 pointer-events-auto min-w-[300px] z-[100]`;
    toast.innerHTML = `<span class="text-xl">${icon}</span><div class="font-bold text-sm">${message}</div>`;

    if(toastContainer) toastContainer.appendChild(toast);
    playSound(type);

    requestAnimationFrame(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'));
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-[100px]');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// === توليد بصمة بسيطة للجهاز ===
function getFingerprint() {
    return navigator.userAgent + "|" + screen.width + "x" + screen.height;
}

// === نظام الرعد (Thunder System) ===
function showThunderWarning(title, msg, isBan = false) {
    if(!thunderModal) return;
    thunderModal.classList.remove('hidden');
    thunderTitle.innerText = title;
    thunderMsg.innerText = msg;
    
    playSound('error');

    if (isBan) {
        thunderBtn.innerText = "تسجيل الخروج (أنت محظور)";
        thunderBtn.className = "w-full py-3 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.5)]";
        thunderBtn.onclick = () => location.href = '/logout';
    } else {
        thunderBtn.innerText = "فهمت، سألتزم بالقواعد";
        thunderBtn.className = "w-full py-3 px-6 rounded-xl font-bold text-white bg-yellow-600 hover:bg-yellow-700";
        thunderBtn.onclick = () => {
            thunderModal.classList.add('hidden');
            location.reload();
        };
    }
}

// === استخراج معرفات الفيديو ===
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

// === تحميل الفيديو التالي ===
async function loadNextVideo() {
    try {
        clearInterval(timerInterval);
        isExternalMode = false;
        externalStartTime = 0; // إعادة تعيين
        
        const res = await fetch('/api/next-video');
        const data = await res.json();

        if (data.success) {
            currentVideoId = data.video._id;
            const videoUrl = data.video.url;
            
            if (videoUrl.includes('youtu')) {
                const ytId = getYouTubeID(videoUrl);
                container.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0" style="width: 100%; height: 80vh; border: none;" allow="autoplay" referrerpolicy="no-referrer"></iframe>`;
                startTimer();
            } else if (videoUrl.includes('tiktok')) {
                const tkId = getTikTokID(videoUrl);
                if (tkId) {
                    container.innerHTML = `<iframe src="https://www.tiktok.com/embed/v2/${tkId}?lang=en-US" style="width: 100%; height: 80vh; border: none;" allow="encrypted-media;" referrerpolicy="no-referrer"></iframe>`;
                    startTimer();
                } else {
                    // الوضع الخارجي
                    isExternalMode = true;
                    timerDisplay.innerText = "انتظار...";
                    container.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-64 text-center px-4 mt-20">
                            <h2 class="text-xl font-bold text-white mb-4">فيديو خارجي</h2>
                            <p class="text-gray-300 mb-6">شاهد لمدة 15 ثانية في التطبيق ثم عد</p>
                            <a id="external-btn" href="${videoUrl}" target="_blank" 
                               class="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-full font-bold text-lg animate-pulse shadow-lg border-2 border-pink-400">
                                🚀 اضغط للمشاهدة
                            </a>
                            <p id="external-status" class="text-gray-500 mt-4 text-sm"></p>
                        </div>`;
                    
                    document.getElementById('external-btn').addEventListener('click', () => {
                        externalStartTime = Date.now();
                        timerDisplay.innerText = "⏳ جاري التحقق...";
                        timerDisplay.classList.remove('text-green-400');
                        timerDisplay.classList.add('text-yellow-400');
                        document.getElementById('external-status').innerText = "شاهد الفيديو لمدة 15 ثانية ثم عد هنا...";
                    });
                }
            }
        } else {
            container.innerHTML = `<h2 class="text-white text-center mt-20">${data.message}</h2>`;
            timerDisplay.innerText = "--";
        }
    } catch (e) { console.error(e); }
}

// === بدء العداد ===
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

// === استلام المكافأة ===
async function claimReward() {
    timerDisplay.innerText = "💰...";
    try {
        const res = await fetch('/api/reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: currentVideoId })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(`أحسنت! رصيدك الجديد: ${data.newPoints} نقطة`, 'success');
            timerDisplay.innerText = "✅";
            setTimeout(loadNextVideo, 2000); 
        } else {
            showToast("حدث خطأ في استلام المكافأة", "error");
        }
    } catch (e) { 
        console.error(e);
        showToast("حدث خطأ في الاتصال", "error");
    }
}

// === الإبلاغ عن الغش ===
async function reportFraud(reason) {
    try {
        const res = await fetch('/api/report-fraud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reason: reason || 'Time Trap (Fast Return)',
                fingerprint: getFingerprint()
            })
        });
        const data = await res.json();
        
        if (data.success) {
            if (data.action === 'banned') {
                showThunderWarning("⛔ تم حظر الحساب", data.message, true);
            } else {
                showThunderWarning("⚠️ تحذير أمني", data.message, false);
            }
        }
    } catch (e) { console.error(e); }
}

// === مراقبة النشاط (visibility change) ===
document.addEventListener("visibilitychange", function() {
    if (!isExternalMode) {
        // الوضع العادي (يوتيوب / تيك توك مضمن)
        if (document.hidden) {
            isPaused = true;
            document.title = "⚠️ عد فوراً!";
            timerDisplay.classList.add('text-red-500');
        } else {
            isPaused = false;
            document.title = "Hive Viewer 👁️";
            timerDisplay.classList.remove('text-red-500');
        }
    } else {
        // الوضع الخارجي - فقط عند العودة للصفحة
        if (!document.hidden && externalStartTime > 0) {
            const timeSpent = (Date.now() - externalStartTime) / 1000;
            
            console.log("Time spent outside:", timeSpent, "seconds"); // للتصحيح
            
            // إعادة تعيين فوراً لمنع التكرار
            externalStartTime = 0;
            
            if (timeSpent >= 15) {
                // ✅ نجاح - شاهد لمدة كافية
                timerDisplay.innerText = "✅ تم التحقق!";
                timerDisplay.classList.remove('text-yellow-400');
                timerDisplay.classList.add('text-green-400');
                claimReward();
            } else if (timeSpent >= 3) {
                // ⚠️ عاد مبكراً - تحذير بدون حظر
                showToast(`يجب المشاهدة لمدة 15 ثانية! (شاهدت ${Math.floor(timeSpent)} ثواني فقط)`, "error");
                timerDisplay.innerText = "❌ أعد المحاولة";
                // إعادة تحميل بعد 3 ثواني
                setTimeout(loadNextVideo, 3000);
            }
            // إذا أقل من 3 ثواني = تجاهل (قد يكون تبديل سريع للتبويبات)
        }
    }
});

// === بدء التشغيل ===
loadNextVideo();
