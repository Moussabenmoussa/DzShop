let currentVideoId = null;
let timeLeft = 15;
let timerInterval;
let isPaused = false;
let isExternalMode = false;
let externalStartTime = 0;

const timerDisplay = document.getElementById('timer');



// === 1. تعريف عناصر الإشعارات ونظام الرعد ===
const toastContainer = document.getElementById('toast-container');
const thunderModal = document.getElementById('thunder-modal');
const thunderTitle = document.getElementById('thunder-title');
const thunderMsg = document.getElementById('thunder-msg');
const thunderBtn = document.getElementById('thunder-btn');

// === 2. نظام الأصوات ===
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

// === 3. دالة إظهار الإشعار (Toast) ===
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




const container = document.getElementById('video-container');

// === دوال نظام الرعد (UI) ===
const thunderModal = document.getElementById('thunder-modal');
const thunderTitle = document.getElementById('thunder-title');
const thunderMsg = document.getElementById('thunder-msg');
const thunderBtn = document.getElementById('thunder-btn');

function showThunderWarning(title, msg, isBan = false) {
    thunderModal.classList.remove('hidden');
    thunderTitle.innerText = title;
    thunderMsg.innerText = msg;
    
    if (isBan) {
        // تصميم الحظر (أحمر + زر خروج)
        thunderBtn.innerText = "تسجيل الخروج";
        thunderBtn.className = "w-full py-3 px-6 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.5)]";
        thunderBtn.onclick = () => location.href = '/logout';
        // منع إغلاق النافذة
    } else {
        // تصميم التحذير (برتقالي)
        thunderBtn.innerText = "أعتذر، سألتزم بالقواعد";
        thunderBtn.className = "w-full py-3 px-6 rounded-xl font-bold text-white bg-yellow-600 hover:bg-yellow-700";
        thunderBtn.onclick = closeThunderModal;
    }
}

function closeThunderModal() {
    thunderModal.classList.add('hidden');
    location.reload(); // إعادة تحميل الصفحة لتصفير العدادات
}

// === توليد بصمة بسيطة للجهاز ===
function getFingerprint() {
    return navigator.userAgent + "|" + screen.width + "x" + screen.height;
}

// === الدوال الأساسية (تم دمجها مع الحماية) ===

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
                        </div>`;
                    
                    document.getElementById('external-btn').addEventListener('click', () => {
                        externalStartTime = Date.now();
                        timerDisplay.innerText = "تحقق...";
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

// 3. استلام المكافأة
async function claimReward() {
    timerDisplay.innerText = "💰..."; // أو أي نص كنت تضعه هنا
    try {
        const res = await fetch('/api/reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: currentVideoId })
        });
        const data = await res.json();
        
        if (data.success) {
            // 👇👇👇 أضف السطر هنا بالضبط 👇👇👇
            showToast(`أحسنت! رصيدك الجديد: ${data.newPoints} نقطة`, 'success');
            // 👆👆👆

            timerDisplay.innerText = "✅"; // تغيير النص لعلامة صح
            
            // الانتظار قليلاً قبل تحميل الفيديو التالي
            setTimeout(loadNextVideo, 2000); 
        }
    } catch (e) { 
        console.error(e);
        // يمكنك أيضاً إضافة إشعار خطأ هنا إذا أردت
        showToast("حدث خطأ في الاتصال", "error");
    }
}

// === الإبلاغ عن الغش (الرابط مع السيرفر) ===
async function reportFraud() {
    try {
        const res = await fetch('/api/report-fraud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reason: 'Time Trap (Returning too fast)',
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

// مراقبة النشاط
document.addEventListener("visibilitychange", function() {
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
    } else {
        // الوضع الخارجي
        if (!document.hidden && externalStartTime > 0) {
            const timeNow = Date.now();
            const timeSpent = (timeNow - externalStartTime) / 1000;

            if (timeSpent >= 15) {
                externalStartTime = 0;
                claimReward();
            } else {
                externalStartTime = 0;
                // هنا نبلغ السيرفر فوراً عن الغش!
                reportFraud();
            }
        }
    }
});





// === دوال نظام الرعد (Thunder System) ===
function getFingerprint() {
    return navigator.userAgent + "|" + screen.width + "x" + screen.height;
}

function showThunderWarning(title, msg, isBan = false) {
    if(!thunderModal) return;
    thunderModal.classList.remove('hidden');
    thunderTitle.innerText = title;
    thunderMsg.innerText = msg;
    
    playSound('error'); // صوت رعب

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
            // إظهار النافذة السوداء بناءً على رد السيرفر
            if (data.action === 'banned') {
                showThunderWarning("⛔ تم حظر الحساب", data.message, true);
            } else {
                showThunderWarning("⚠️ تحذير أمني", data.message, false);
            }
        }
    } catch (e) { console.error(e); }
}






loadNextVideo();
