// 🎭 TIKHIVE INJECTOR: Ultimate Deep Spoofing
// يقوم بحقن بيانات العتاد الحقيقي (CPU, RAM, GPU) المسحوبة من المصيدة

(async function() {
    console.log('%c💉 Injector: Requesting Deep Identity...', 'color: cyan; font-weight: bold;');

    try {
        // 1. طلب هوية حقيقية من السيرفر
        const response = await fetch('/api/get-identity');
        const result = await response.json();

        if (!result.success) {
            console.warn('⚠️ No identities found. Running in passive mode.');
            return;
        }

        const fake = result.data;

        // معالجة قياسات الشاشة (لأنها تأتي كنص "1920x1080")
        let screenW = 1920, screenH = 1080;
        if (fake.screen && typeof fake.screen === 'string') {
            const dims = fake.screen.split('x');
            screenW = parseInt(dims[0]);
            screenH = parseInt(dims[1]);
        }

        // 👇 رسالة تأكيد للمستخدم (كما طلبت)
        console.log(`%c🕵️ Identity Acquired: ${fake.gpu_renderer}`, 'color: #00ff00; font-size: 12px;');
        // يمكنك تفعيل التنبيه إذا أردت، لكني جعلته في الكونسول ليكون أسرع
        // alert(`🕵️ تم تقمص الشخصية:\n\nGPU: ${fake.gpu_renderer}\nRAM: ${fake.ram_size}GB\nCores: ${fake.cpu_cores}`);

        // ====================================================
        // 2. تزوير العتاد الصلب (CPU & RAM) - [الجديد والمهم]
        // ====================================================
        
        // تزوير عدد الأنوية
        if (fake.cpu_cores) {
            Object.defineProperty(navigator, 'hardwareConcurrency', { 
                get: () => parseInt(fake.cpu_cores),
                configurable: true 
            });
        }

        // تزوير الرامات (Device Memory)
        if (fake.ram_size) {
            Object.defineProperty(navigator, 'deviceMemory', { 
                get: () => parseInt(fake.ram_size),
                configurable: true 
            });
        }

        // ====================================================
        // 3. تزوير مواصفات كرت الشاشة (Deep WebGL Spoofing)
        // ====================================================
        const getParameterProxy = new Proxy(WebGLRenderingContext.prototype.getParameter, {
            apply: function(target, thisArg, args) {
                const param = args[0];
                // تزوير الشركة المصنعة (Vendor)
                if (param === 37445) return fake.vendor || "Google Inc. (NVIDIA)";
                // تزوير اسم الكرت (Renderer)
                if (param === 37446) return fake.gpu_renderer || "NVIDIA GeForce RTX 3060";
                return Reflect.apply(target, thisArg, args);
            }
        });

        // تطبيق القناع على WebGL 1.0 و 2.0
        WebGLRenderingContext.prototype.getParameter = getParameterProxy;
        if (window.WebGL2RenderingContext) {
            WebGL2RenderingContext.prototype.getParameter = getParameterProxy;
        }

        // ====================================================
        // 4. تزوير خصائص الشاشة (Screen Properties)
        // ====================================================
        Object.defineProperties(screen, {
            width: { get: () => screenW },
            height: { get: () => screenH },
            availWidth: { get: () => screenW },
            availHeight: { get: () => screenH },
            colorDepth: { get: () => 24 },
            pixelRatio: { get: () => 1 } // يمكن جعلها ديناميكية لاحقاً
        });

        // ====================================================
        // 5. تزوير الهوية والنظام (User Agent & Platform)
        // ====================================================
        Object.defineProperty(navigator, 'userAgent', { 
            get: () => fake.userAgent,
            configurable: true 
        });

        // تزوير المنصة (مهم جداً لتطابق النظام مع المتصفح)
        if (fake.platform) {
            Object.defineProperty(navigator, 'platform', { 
                get: () => fake.platform,
                configurable: true 
            });
        }

        // ====================================================
        // 6. تزوير الكانفس (Canvas Noise) - للحماية من التتبع
        // ====================================================
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
            const context = this.getContext('2d');
            if (context) {
                // نستخدم رقم عشوائي بسيط بناءً على عرض الشاشة لتوليد بصمة فريدة لهذا الجهاز
                const shift = (screenW % 10) - 5; 
                try {
                    const imageData = context.getImageData(0, 0, 1, 1);
                    imageData.data[0] = imageData.data[0] + shift; 
                    context.putImageData(imageData, 0, 0);
                } catch(e) {}
            }
            return toDataURL.apply(this, arguments);
        };

        // ====================================================
        // 7. خدعة التبويب النشط (Visibility Cloak) 👁️
        // ====================================================
        Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });

        // منع اكتشاف تغيير التبويب
        const originalAddEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
            if (type === 'visibilitychange' || type === 'webkitvisibilitychange' || type === 'blur') {
                return; 
            }
            return originalAddEventListener.call(document, type, listener, options);
        };

        console.log('%c✅ Deep Injection Active: GPU, RAM, CPU & OS Spoofed.', 'color: #00ff00; font-weight: bold;');

    } catch (e) {
        console.error('❌ Injection Failed:', e);
    }
})();
