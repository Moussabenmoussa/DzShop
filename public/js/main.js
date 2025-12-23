// ==========================================
// 🧠 Hive Engine Main Controller (Storage Version)
// يدعم الذاكرة الدائمة لحل مشكلة تحديث الصفحة في الموبايل
// ==========================================

let currentVideoId = null;
let timeLeft = 15;
let timerInterval;
let isPaused = false;
let isExternalMode = false;


// عناصر الواجهة
const timerDisplay = document.getElementById('timer');
const container = document.getElementById('video-container');
const toastContainer = document.getElementById('toast-container');
const thunderModal = document.getElementById('thunder-modal');
const thunderTitle = document.getElementById('thunder-title');
const thunderMsg = document.getElementById('thunder-msg');
const thunderBtn = document.getElementById('thunder-btn');

// === 1. نظام الأصوات والإشعارات ===
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

// === 2. نظام الرعد والحماية ===
function getFingerprint() {
    return navigator.userAgent + "|" + screen.width + "x" + screen.height;
}

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
            if (data.action === 'banned') showThunderWarning("⛔ تم حظر الحساب", data.message, true);
            else showThunderWarning("⚠️ تحذير أمني", data.message, false);
        }
    } catch (e) { console.error(e); }
}

// === 3. أدوات الفيديو ===
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

// === 4. المنطق الرئيسي (التحميل) ===
async function loadNextVideo() {
    try {
        clearInterval(timerInterval);
        isExternalMode = false;
        
        // تنظيف أي حالة قديمة
        localStorage.removeItem('hive_mission_start');
        
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 mt-20">
                <div class="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-gray-400 animate-pulse">جاري جلب الفيديو...</p>
            </div>`;
        timerDisplay.innerText = "--:--";
        
        const res = await fetch('/api/next-video');
        const data = await res.json();

        if (data.success) {
            currentVideoId = data.video._id;
            const videoUrl = data.video.url;

timeLeft = data.video.duration || 30;

            
            playSound('click');

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
                    // === تصميم الهاتف الحقيقي (Full Screen Overlay) ===
                    isExternalMode = true;
                    timerDisplay.innerText = "انتظار";
                    
                    // استخدام 'fixed inset-0' يجبر التصميم على ملء شاشة الهاتف بالكامل
                    // z-[60] يجعله يغطي حتى القوائم العلوية
                    container.innerHTML = `
                        <div class="fixed inset-0 z-[60] bg-gray-900 flex flex-col justify-between p-6 pb-10 w-screen h-screen overflow-hidden">
                            
                            <!-- 1. الرأس: مساحة كبيرة في الأعلى -->
                            <div class="flex flex-col items-center justify-center mt-10">
                                <div class="w-28 h-28 bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-2xl border border-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h1 class="text-4xl font-bold text-white mb-2">مهمة خارجية</h1>
                                <p class="text-gray-400 text-lg">TikTok App</p>
                            </div>

                            <!-- 2. الوسط: التعليمات بخط كبير جداً -->
                            <div class="bg-gray-800/50 p-6 rounded-3xl border border-gray-700">
                                <div class="flex items-center gap-4 mb-6">
                                    <span class="bg-gray-700 w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold text-white">1</span>
                                    <p class="text-white text-xl">اضغط الزر بالأسفل</p>
                                </div>
                                <div class="flex items-center gap-4 mb-6">
                                    <span class="bg-yellow-900/50 w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold text-yellow-500">2</span>
                                    <p class="text-white text-xl">شاهد <span class="text-yellow-400 font-bold text-2xl">${timeLeft}</span> ثانية</p>
                                </div>
                                <div class="flex items-center gap-4">
                                    <span class="bg-green-900/50 w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold text-green-500">3</span>
                                    <p class="text-white text-xl">عد هنا لاستلام النقاط</p>
                                </div>
                            </div>

                            <!-- 3. الأسفل: زر ضخم يملأ العرض -->
                            <div class="w-full">
                                <a id="external-btn" href="${videoUrl}" target="_blank" 
                                   class="flex items-center justify-center w-full bg-pink-600 active:bg-pink-700 text-white py-6 rounded-2xl font-bold text-2xl shadow-xl transition-transform active:scale-95">
                                    🚀 تنفيذ المهمة
                                </a>
                            </div>
                        </div>`;
                    
                    // كود الزر
                    document.getElementById('external-btn').addEventListener('click', () => {
                         localStorage.setItem('hive_mission_start', Date.now());
                         localStorage.setItem('hive_mission_video', currentVideoId);
                         localStorage.setItem('hive_mission_duration', timeLeft);
                         
                         playSound('click');
                         timerDisplay.innerText = "تحقق...";
                         timerDisplay.classList.add('text-yellow-400');
                         showToast(`ابدأ المشاهدة الآن (${timeLeft} ثانية)`, "info");
                    });
                }



                
            }
        } else {
            container.innerHTML = `<h2 class="text-white text-center mt-20 opacity-75">${data.message}</h2>`;
            timerDisplay.innerText = "--";
        }
    } catch (e) { console.error(e); }
}

// === 5. العداد (للمشاهدة الداخلية فقط) ===
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
            claimReward(currentVideoId);
        }
    }, 1000);
}

async function claimReward(videoId) {
    timerDisplay.innerText = "💰...";
    try {
        const res = await fetch('/api/reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: videoId })
        });
        const data = await res.json();
        
        if (data.success) {
            showToast(`أحسنت! رصيدك الجديد: ${data.newPoints} نقطة`, 'success');
            timerDisplay.innerText = "✅";
            // تنظيف الذاكرة
            localStorage.removeItem('hive_mission_start');
            setTimeout(loadNextVideo, 2000);
        } else {
             showToast("خطأ في المكافأة", "error");
        }
    } catch (e) { showToast("خطأ في الاتصال", "error"); }
}


// === 6. فحص المهام الخارجية (النسخة المتسامحة) ===
function checkExternalMission() {
    const savedTime = localStorage.getItem('hive_mission_start');
    const savedVideo = localStorage.getItem('hive_mission_video');
const requiredTime = parseInt(localStorage.getItem('hive_mission_duration')) || 30;
    if (savedTime && savedVideo) {
        const timeNow = Date.now();
        const timeSpent = (timeNow - parseInt(savedTime)) / 1000;

        console.log(`⏱️ مرت ${timeSpent} ثانية`);

        if (timeSpent >= 15) {
            // ✅ نجاح - مر الوقت الكافي
            timerDisplay.innerText = "✅ جاري المعالجة...";
            timerDisplay.classList.remove('text-yellow-400');
            timerDisplay.classList.add('text-green-400');
            
            // مسح الذاكرة
            localStorage.removeItem('hive_mission_start');
            
            // طلب المكافأة
            claimReward(savedVideo);
            return true;
        } else {
            // ⚠️ تنبيه فقط (بدون حظر وبدون إلغاء المهمة)
            // نعطي المستخدم فرصة للعودة للتطبيق لإكمال الوقت
            const remaining = Math.ceil(15 - timeSpent);
            
            showToast(`عدت بسرعة! بقي ${remaining} ثانية. ارجع للتطبيق!`, "error");
            timerDisplay.innerText = `بقي ${remaining} ثانية`;
            timerDisplay.classList.add('text-red-500');
            
            // 🛑 لا نحذف LocalStorage (نترك المهمة معلقة)
            // 🛑 لا نرسل reportFraud (لا نعاقب)
            
            return true; // نعتبرها معالجة لكي لا يحمل فيديو جديد
        }
    }
    return false;
}


// === 7. المراقبة والتشغيل ===

// عند تغيير التبويب أو العودة للتطبيق
document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
        // المستخدم عاد للصفحة -> نفحص هل كان في مهمة؟
        const handled = checkExternalMission();
        if (handled) return; // إذا عالجنا مهمة خارجية لا نفعل شيئاً آخر
        
        // إذا لم تكن مهمة خارجية وكان الفيديو داخلي
        if (!isExternalMode) {
            isPaused = false;
            document.title = "Hive Viewer 👁️";
            timerDisplay.classList.remove('text-red-500');
        }
    } else {
        // المستخدم غادر
        if (!isExternalMode) {
            isPaused = true;
            document.title = "⚠️ عد فوراً!";
            timerDisplay.classList.add('text-red-500');
        }
    }
});

// عند فتح الصفحة لأول مرة
document.addEventListener('DOMContentLoaded', () => {
    // نفحص أولاً: هل الصفحة أُعيد تحميلها بعد مهمة تيك توك؟
    const handled = checkExternalMission();
    
    // إذا لم نجد مهمة سابقة، نحمل فيديو جديد
    if (!handled) {
        loadNextVideo();
    }
});
