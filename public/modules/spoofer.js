// 🎭 TIKHIVE INJECTOR: Hybrid Mode (Zero-Latency + Fetch)
// يدعم الحقن الفوري من السيرفر لسرعة قصوى

(async function() {
    let fake = null;

    // ⚡ الطريقة السريعة: هل أرسل السيرفر الهوية مسبقاً؟
    if (window.JOKER_IDENTITY) {
        console.log('%c⚡ JOKER: Zero-Latency Injection Active!', 'color: #facc15; font-weight: bold;');
        fake = window.JOKER_IDENTITY;
    } 
    // 🐢 الطريقة البطيئة (احتياطية): طلب الهوية عبر الإنترنت
    else {
        console.log('📡 JOKER: Fetching identity from server...');
        try {
            const response = await fetch('/api/get-identity');
            const result = await response.json();
            if (result.success) fake = result.data;
        } catch (e) { console.error("Identity fetch failed", e); }
    }

    if (!fake) {
        console.warn('⚠️ No identity to inject.');
        return;
    }

    try {
        // ==========================================
        // تنفيذ التزوير (Spoofing Logic)
        // ==========================================

        // 1. تزوير WebGL (كرت الشاشة)
        const getParameterProxy = new Proxy(WebGLRenderingContext.prototype.getParameter, {
            apply: function(target, thisArg, args) {
                // 37445 = Vendor, 37446 = Renderer
                if (args[0] === 37445) return fake.vendor || "Google Inc. (NVIDIA)";
                if (args[0] === 37446) return fake.gpu_renderer || "NVIDIA GeForce RTX 3060";
                return Reflect.apply(target, thisArg, args);
            }
        });
        WebGLRenderingContext.prototype.getParameter = getParameterProxy;
        if (window.WebGL2RenderingContext) {
            WebGL2RenderingContext.prototype.getParameter = getParameterProxy;
        }

        // 2. تزوير CPU & RAM & Platform
        // ملاحظة: نستخدم defineProperty لتجاوز القيم للقراءة فقط
        if (fake.cpu_cores) {
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => parseInt(fake.cpu_cores), configurable: true });
        }
        if (fake.ram_size) {
            Object.defineProperty(navigator, 'deviceMemory', { get: () => parseInt(fake.ram_size), configurable: true });
        }
        if (fake.userAgent) {
            Object.defineProperty(navigator, 'userAgent', { get: () => fake.userAgent, configurable: true });
        }
        if (fake.platform) {
            Object.defineProperty(navigator, 'platform', { get: () => fake.platform, configurable: true });
        }

        // 3. منع كشف التبويب (Visibility Cloak)
        Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
        
        // منع الأحداث التي تفضح الخروج
        const originalAddEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
            if (type === 'visibilitychange' || type === 'webkitvisibilitychange' || type === 'blur') return;
            return originalAddEventListener.call(document, type, listener, options);
        };

        console.log(`%c🎭 Identity Applied: ${fake.gpu_renderer} [${fake.platform}]`, 'color: #4ade80;');

    } catch (e) {
        console.error("Spoofing Error:", e);
    }
})();
