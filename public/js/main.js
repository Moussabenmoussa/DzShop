
// === المتغيرات الأساسية ===
let currentVideoId = null;
let timeLeft = 15;
let timerInterval;
let isPaused = false;
let isExternalMode = false;
let externalStartTime = 0;

// === عناصر الصفحة ===
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

// === توليد بصمة الجهاز ===
function getFingerprint() {
    return navigator.userAgent + "|" + screen.width + "x" + screen.height;
}

// === دوال نظام الرعد (Thunder System) ===
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

// === الإبلاغ عن الغش ===
async function reportFraud() {
    try {
        const res = await fetch('/api/report-fraud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reason: 'Time Trap (Fast Return)',
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

// === دالة استخراج معرف TikTok المحسّنة ===
function getTikTokID(url) {
    if (!url) return null;
    
    // 1. صيغة: /video/1234567890123456789
    let match = url.match(/video\/(\d{15,25})/);
    if (match) return match[1];
    
    // 2. صيغة: /v/1234567890123456789
    match = url.match(/\/v\/(\d{15,25})/);
    if (match) return match[1];
    
    // 3. صيغة: @username/video/ID
    match = url.match(/@[\w.-]+\/video\/(\d{15,25})/);
    if (match) return match[1];
    
    // 4. صيغة قديمة مع أرقام أقل
    match = url.match(/video\/(\d{10,})/);
    if (match) return match[1];
    
    // 5. إذا كان رابط مختصر - نعيد null للوضع الخارجي
    if (url.includes('vm.tiktok.com') || url.includes('tiktok.com/t/') || url.includes('vt.tiktok.com')) {
        return null;
    }
    
    return null;
}

// === دالة استخراج معرف YouTube ===
function getYouTubeID(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|embed\/|shorts\/))([^?&"'>]+)/);
    return match ? match[1] : null;
}

// === دالة عرض الوضع الخارجي ===
function showExternalMode(videoUrl) {
    isExternalMode = true;
    timerDisplay.innerText = "انتظار...";
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-64 text-center px-4 mt-20">
            <h2 class="text-xl font-bold text-white mb-4">🎬 فيديو خارجي</h2>
            <p class="text-gray-300 mb-6">شاهد الفيديو لمدة 15 ثانية على الأقل ثم عد هنا</p>
            <a id="external-btn" href="${videoUrl}" target="_blank" 
               class="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-full font-bold text-lg animate-pulse shadow-lg border-2 border-pink-400">
                🚀 افتح الفيديو
            </a>
            <p class="text-gray-500 text-sm mt-4">سيتم احتساب النقاط تلقائياً عند عودتك</p>
        </div>`;
    
    const externalBtn = document.getElementById('external-btn');
    if (externalBtn) {
        externalBtn.addEventListener('click', () => {
            externalStartTime = Date.now();
            timerDisplay.innerText = "⏳ تحقق...";
            timerDisplay.classList.add('text-yellow-400');
        });
    }
}

// === تحميل الفيديو التالي ===
async function loadNextVideo() {
    try {
        clearInterval(timerInterval);
        isExternalMode = false;
        
        const res = await fetch('/api/next-video');
        const data = await res.json();

        if (data.success) {
            currentVideoId = data.video._id;
            const videoUrl = data.video.url;
            
            if (videoUrl.includes('youtu')) {
                // === YouTube ===
                const ytId = getYouTubeID(videoUrl);
                if (ytId) {
                    container.innerHTML = `
                        <div class="flex justify-center items-center" style="height: 80vh;">
                            <iframe 
                                src="https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0" 
                                style="width: 100%; max-width: 800px; height: 450px; border: none;" 
                                allow="autoplay; encrypted-media" 
                                referrerpolicy="no-referrer"
                                allowfullscreen>
                            </iframe>
                        </div>`;
                    startTimer();
                } else {
                    showExternalMode(videoUrl);
                }
            } else if (videoUrl.includes('tiktok')) {
                // === TikTok ===
                const tkId = getTikTokID(videoUrl);
                
                if (tkId) {
                    // الوضع المدمج (Embed)
                    container.innerHTML = `
                        <div class="flex justify-center items-center" style="height: 80vh;">
                            <iframe 
                                src="https://www.tiktok.com/embed/v2/${tkId}" 
                                style="width: 325px; height: 745px; max-height: 80vh; border: none;" 
                                allow="encrypted-media;" 
                                referrerpolicy="no-referrer">
                            </iframe>
                        </div>`;
                    startTimer();
                } else {
                    // الوضع الخارجي (للروابط المختصرة)
                    showExternalMode(videoUrl);
                }
            } else {
                // === روابط أخرى ===
                showExternalMode(videoUrl);
            }
        } else {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center mt-20 text-center">
                    <div class="text-6xl mb-4">📭</div>
                    <h2 class="text-white text-xl font-bold">${data.message}</h2>
                    <p class="text-gray-400 mt-2">جرب مرة أخرى لاحقاً</p>
                    <button onclick="loadNextVideo()" class="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold">
                        🔄 إعادة المحاولة
                    </button>
                </div>`;
            timerDisplay.innerText = "--";
        }
    } catch (e) { 
        console.error(e);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center mt-20 text-center">
                <div class="text-6xl mb-4">⚠️</div>
                <h2 class="text-red-500 text-xl font-bold">حدث خطأ في الاتصال</h2>
                <p class="text-gray-400 mt-2">تحقق من اتصالك بالإنترنت</p>
                <button onclick="loadNextVideo()" class="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold">
                    🔄 إعادة المحاولة
                </button>
            </div>`;
    }
}

// === بدء العد التنازلي ===
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
            
            // الانتظار قليلاً قبل تحميل الفيديو التالي
            setTimeout(loadNextVideo, 2000); 
        } else {
            showToast("حدث خطأ، حاول مجدداً", "error");
            setTimeout(loadNextVideo, 2000);
        }
    } catch (e) { 
        console.error(e);
        showToast("حدث خطأ في الاتصال", "error");
        setTimeout(loadNextVideo, 3000);
    }
}

// === مراقبة النشاط (Visibility API) ===
document.addEventListener("visibilitychange", function() {
    if (!isExternalMode) {
        // الوضع العادي (Embed)
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
    // الوضع الخارجي
    if (!document.hidden && externalStartTime > 0) {
        const timeNow = Date.now();
        const timeSpent = (timeNow - externalStartTime) / 1000;

        // إعادة تعيين قبل أي إجراء لمنع التكرار
        const startTime = externalStartTime;
        externalStartTime = 0;

        // إذا قضى 15 ثانية أو أكثر = نجاح
        if (timeSpent >= 15) {
            claimReward();
        } else if (timeSpent >= 3) {
            // إذا عاد بعد 3-15 ثانية = تحذير بدون إبلاغ
            showToast("يجب المشاهدة لمدة 15 ثانية على الأقل!", "error");
        }
        // إذا أقل من 3 ثواني = تجاهل (قد يكون انتقال سريع بين التبويبات)
    }
}

});

// === بدء التشغيل ===
loadNextVideo();
