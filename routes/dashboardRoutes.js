const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const Fingerprint = require('../models/Fingerprint'); // 👈 ضروري جداً للجوكر
const { isAuth } = require('../utils/middleware');
// 👇 استدعاء أداة الفحص التقني (TLS Fingerprint)
const { checkVideoLink } = require('../utils/browserMock');

// 1. عرض لوحة التحكم
router.get('/dashboard', isAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        // نعرض للمستخدم حملاته سواء كانت مقبولة أو قيد المراجعة
        const myVideos = await Video.find({ userId: user._id }).sort({ createdAt: -1 });
        res.render('dashboard', { user, videos: myVideos });
    } catch (e) {
        res.redirect('/');
    }
});

// 2. إضافة حملة جديدة (بوابة التفتيش الذكية 🛡️)
router.post('/add-video', isAuth, async (req, res) => {
    try {
        const { url, targetViews, duration, type, visitType, keyword } = req.body;

        // ============================================================
        // 🛑 المرحلة 1: الفلترة الأمنية (The Gatekeeper)
        // ============================================================
        
        let platform = 'other';
        let status = 'Approved';
        let active = true; // هل تظهر للناس؟

        // قائمة الروابط المختصرة الممنوعة
        const forbiddenShorteners = ['bit.ly', 'tinyurl.com', 'cut.us', 'short.gy', 'goo.gl'];
        if (forbiddenShorteners.some(short => url.includes(short))) {
            return res.send(`<script>alert("🚫 الروابط المختصرة ممنوعة! يرجى وضع الرابط المباشر."); window.location.href="/dashboard";</script>`);
        }

        if (type === 'video') {
            // ✅ سماحية صارمة: يوتيوب وتيك توك فقط
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                platform = 'youtube';
            } else if (url.includes('tiktok.com')) {
                platform = 'tiktok';
            } else {
                // ❌ رفض أي رابط آخر (CPA، إباحي، الخ)
                return res.send(`<script>alert("❌ عذراً! يسمح فقط بروابط YouTube و TikTok في قسم الفيديوهات."); window.location.href="/dashboard";</script>`);
            }
            // الفيديوهات مقبولة فوراً
            status = 'Approved';
            active = true;

        } else if (type === 'website') {
            // ⏳ المواقع تذهب للمراجعة دائماً
            platform = 'website';
            status = 'Pending';
            active = false; // لا تظهر للناس حتى يوافق الأدمن
        }

        // ============================================================
        // 🛑 المرحلة 2: الفحص التقني (باستخدام fetch المدمج - لا يحتاج تثبيت)
        // ============================================================
        
        // التحقق من صحة شكل الرابط (Regex)
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        if (!urlPattern.test(url)) {
            return res.send(`<script>alert("⚠️ الرابط غير صحيح شكلياً."); window.location.href="/dashboard";</script>`);
        }

        // التحقق الحقيقي (Ping) باستخدام fetch
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            // إذا كان الرد 403 (Forbidden) أو 401، فهذا يعني الموقع موجود لكنه محمي
            if (response.status === 403 || response.status === 401) {
                console.log(`⚠️ الموقع ${url} يعمل لكنه يحظر البوتات، تم قبوله.`);
            } 
            
        } catch (error) {
            // في حالة fetch، الأخطاء تكون مثل فشل الشبكة (DNS Error)
            if (error.cause && (error.cause.code === 'ECONNREFUSED' || error.cause.code === 'ENOTFOUND')) {
                console.error("❌ الرابط لا يعمل:", error.message);
                return res.send(`<script>alert("⚠️ الرابط لا يعمل! تأكد أنه متاح للعامة."); window.location.href="/dashboard";</script>`);
            }
        }
        
        // ============================================================
        // 💰 المرحلة 3: الحسابات والخصم
        // ============================================================
        let cost = 2; 
        let finalDuration = 30;
        
        // تسعير المدة
        const dur = parseInt(duration);
        if (dur === 60) { cost += 2; finalDuration = 60; }
        else if (dur === 90) { cost += 4; finalDuration = 90; }

        // تسعير النوع (بحث جوجل أغلى)
        if (type === 'website' && visitType === 'search') {
            cost += 2;
        }

        // التحقق من الرصيد
        const user = await User.findById(req.session.userId);
        const totalCost = cost * targetViews;

        if (user.points < totalCost) {
            return res.send(`<script>alert("🚫 رصيدك غير كافي!\\nتحتاج ${totalCost} نقطة."); window.location.href="/dashboard";</script>`);
        }

        // خصم النقاط فوراً (حتى للمواقع المعلقة)
        await User.findByIdAndUpdate(user._id, { $inc: { points: -totalCost } });

        // ============================================================
        // 💾 المرحلة 4: الحفظ في قاعدة البيانات
        // ============================================================
        await Video.create({
            userId: req.session.userId,
            type: type || 'video',
            visitType: (type === 'website') ? visitType : undefined,
            keyword: (type === 'website' && visitType === 'search') ? keyword : undefined,
            url: url,
            targetViews: targetViews,
            duration: finalDuration,
            costPerView: cost,
            
            // البيانات الجديدة التي أضفناها
            platform: platform,
            status: status,
            active: active // false للمواقع، true للفيديوهات
        });

        // رسالة النجاح تختلف حسب النوع
        if (type === 'website') {
            return res.send(`<script>alert("✅ تم استلام موقعك!\\nحالة الطلب: قيد المراجعة (Pending).\\nسيتم نشره بعد مراجعة الإدارة."); window.location.href="/dashboard";</script>`);
        } else {
            return res.redirect('/dashboard');
        }

    } catch (e) {
        console.error(e);
        res.send("Error adding campaign");
    }
});

// 3. صفحة المشاهد الآلي (مع الحقن الفوري للهوية ⚡)
router.get('/viewer', isAuth, async (req, res) => {
    try {
        // 1. السيرفر يختار هوية عشوائية فوراً
        const identities = await Fingerprint.aggregate([
            { $sample: { size: 1 } }
        ]);

        let jokerData = null;
        if (identities.length > 0) {
            const id = identities[0];
            jokerData = {
                gpu_renderer: id.gpu_renderer || "NVIDIA GeForce RTX 3060",
                cpu_cores: id.cpu_cores || 8,
                ram_size: id.ram_size || 8,
                userAgent: id.userAgent,
                platform: id.platform || "Win32",
                vendor: "Google Inc. (NVIDIA)" 
            };
        }

        // 2. نرسل الصفحة ونرفق معها الهوية (jokerData)
        res.render('viewer', { 
            layout: false, 
            user: req.user,
            jokerIdentity: jokerData // 👈 هذا هو المفتاح
        });

    } catch (e) {
        console.error(e);
        res.render('viewer', { layout: false, user: req.user, jokerIdentity: null });
    }
});

// 4. صفحة السجن
router.get('/banned', isAuth, (req, res) => {
    if (!req.user.isBanned) {
        return res.redirect('/dashboard');
    }
    res.render('banned', { layout: false }); 
});


    

// 🤡 صفحة اختبار الجوكر (للموبايل)
router.get('/test-joker', isAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Joker Test</title>
            <style>
                body { background: #0f172a; color: #fff; font-family: monospace; padding: 20px; }
                .box { background: #1e293b; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #334155; }
             h1 { color: #facc15; text-align: center; }
                .label { color: #94a3b8; font-size: 12px; display: block; margin-bottom: 5px; }
                .val { color: #4ade80; font-weight: bold; font-size: 16px; word-break: break-all; }
                #status { text-align: center; color: cyan; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>🤡 Joker Diagnostics</h1>
            <p id="status">Injecting Identity...</p>

            <div class="box">
                <span class="label">GPU Renderer (كرت الشاشة):</span>
                <div id="gpu" class="val">Detecting...</div>
            </div>

            <div class="box">
                <span class="label">CPU Cores (الأنوية):</span>
                <div id="cpu" class="val">...</div>
            </div>

            <div class="box">
                <span class="label">RAM (الذاكرة):</span>
                <div id="ram" class="val">...</div>
            </div>

            <div class="box">
                <span class="label">User Agent:</span>
                <div id="ua" class="val">...</div>
            </div>

            <div class="box">
                <span class="label">Platform (النظام):</span>
                <div id="plat" class="val">...</div>
            </div>

            <script type="module" src="/modules/spoofer.js"></script>

            <script>
                setTimeout(() => {
                    // محاولة قراءة كرت الشاشة
                    let gpuName = "Unknown";
                    try {
                        const gl = document.createElement('canvas').getContext('webgl');
                        const debug = gl.getExtension('WEBGL_debug_renderer_info');
                        gpuName = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);
                    } catch(e) {}

                    // عرض البيانات التي يراها المتصفح الآن
                    document.getElementById('gpu').innerText = gpuName;
                    document.getElementById('cpu').innerText = navigator.hardwareConcurrency || "N/A";
                    document.getElementById('ram').innerText = (navigator.deviceMemory || "N/A") + " GB";
                    document.getElementById('ua').innerText = navigator.userAgent;
                    document.getElementById('plat').innerText = navigator.platform;
                    
                    document.getElementById('status').innerText = "✅ Scan Complete (This is what websites see)";
                    document.getElementById('status').style.color = "#4ade80";
                }, 2000); // ننتظر 2 ثانية لضمان اكتمال الحقن
            </script>
        </body>
        </html>
    `);
});



// 👁️ صفحة اختبار التخفي (Visibility Cloak Test)
router.get('/test-visibility', isAuth, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="ltr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cloak Test</title>
            <style>
                body { background: #000; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                .status-box { padding: 20px 40px; border-radius: 20px; font-size: 24px; font-weight: bold; margin-bottom: 20px; transition: all 0.3s; border: 4px solid #333; }
                .active { background: #064e3b; color: #34d399; border-color: #34d399; box-shadow: 0 0 20px #34d399; }
                .inactive { background: #450a0a; color: #f87171; border-color: #f87171; box-shadow: 0 0 20px #f87171; }
                .log { font-family: monospace; color: #888; font-size: 12px; margin-top: 10px; max-width: 300px; text-align: left; }
            </style>
        </head>
        <body>
            <h1>👁️ كاشف التبويب</h1>
            
            <div id="box" class="status-box active">🟢 أنت تشاهدني الآن</div>
            
            <p>عداد الثواني: <span id="counter" style="color: yellow; font-size: 20px;">0</span></p>
            <div id="logs" class="log"></div>

            <script type="module" src="/modules/spoofer.js"></script>

            <script>
                let count = 0;
                const box = document.getElementById('box');
                const logs = document.getElementById('logs');
                
                // عداد مستمر
                setInterval(() => {
                    count++;
                    document.getElementById('counter').innerText = count;
                }, 1000);

                // دالة كشف الخروج
                function handleVisibilityChange() {
                    if (document.hidden) {
                        box.className = "status-box inactive";
                        box.innerHTML = "🔴 تم كشفك! (غير نشط)";
                        logs.innerHTML += "⚠️ Tab Hidden detected!<br>";
                        document.title = "🔴 Inactive";
                    } else {
                        // box.className = "status-box active";
                        // box.innerHTML = "🟢 عدت للمشاهدة";
                        // logs.innerHTML += "✅ Tab Visible again<br>";
                        // document.title = "🟢 Active";
                    }
                }

                // محاولة زرع الجواسيس
                document.addEventListener("visibilitychange", handleVisibilityChange);
                window.addEventListener("blur", () => {
                     // ملاحظة: الجوكر القوي يمنع حتى هذا الحدث
                     logs.innerHTML += "⚠️ Blur detected (Window lost focus)<br>";
                     if(!document.hidden) box.innerHTML += "<br><small>(Blur detected but hidden is false)</small>";
                });
            </script>
        </body>
        </html>
    `);
});









module.exports = router;
