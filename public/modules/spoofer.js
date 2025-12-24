
// 🎭 Identity Injector: Real Device Emulation
// يقوم باستبدال خصائص المتصفح ببيانات جهاز حقيقي تم جلبه من السيرفر

(async function() {
    console.log('💉 Injector: Requesting a clean identity...');

    try {
        // 1. طلب هوية حقيقية من السيرفر
        const response = await fetch('/api/get-identity');
        const result = await response.json();

        if (!result.success) {
            console.warn('⚠️ No identities found in vault. Running in passive mode.');
            return;
        }

        const fake = result.data;
        // 👇 هذا سيظهر رسالة على شاشة هاتفك
alert(`🕵️ TIKHIVE INJECTOR:\n\nتم تقمص الشخصية بنجاح!\n\nالجهاز: ${fake.renderer}\nالمتصفح: ${fake.userAgent.substring(0, 20)}...`);
        // ====================================================
        // 2. تزوير مواصفات كرت الشاشة (WebGL Spoofing) - الأهم!
        // ====================================================
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            // تزوير الشركة المصنعة (Vendor)
            if (parameter === 37445) {
                return fake.vendor; 
            }
            // تزوير اسم الكرت (Renderer) - هذا ما تبحث عنه Cloudflare
            if (parameter === 37446) {
                return fake.renderer; 
            }
            return getParameter.apply(this, arguments);
        };

        // ====================================================
        // 3. تزوير خصائص الشاشة (Screen Properties)
        // ====================================================
        // نستخدم Object.defineProperty لمنع المتصفح من كشف التزوير
        Object.defineProperties(screen, {
            width: { get: () => fake.screen.width },
            height: { get: () => fake.screen.height },
            colorDepth: { get: () => fake.screen.colorDepth },
            pixelRatio: { get: () => fake.screen.pixelRatio }
        });

        // ====================================================
        // 4. تزوير معلومات المتصفح (User Agent & Hardware)
        // ====================================================
        
        // تزوير User Agent (للنصوص البرمجية فقط)
        Object.defineProperty(navigator, 'userAgent', {
            get: () => fake.userAgent
        });

        // تزوير عدد الأنوية والرامات
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => fake.hardware.concurrency
        });
        Object.defineProperty(navigator, 'deviceMemory', {
            get: () => fake.hardware.memory
        });

        // ====================================================
        // 5. تزوير الكانفس (Canvas Noise) - لإعطاء بصمة فريدة
        // ====================================================
        // نضيف تشويشاً طفيفاً جداً ليتوافق مع كرت الشاشة الجديد
        const toDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
            const context = this.getContext('2d');
            if (context) {
                // إضافة توقيع خفي (Shift)
                const shift = (fake.screen.width % 10) - 5; 
                const imageData = context.getImageData(0, 0, 1, 1);
                // تغيير غير مرئي للعين لكنه يغير الـ Hash
                imageData.data[0] = imageData.data[0] + shift; 
                context.putImageData(imageData, 0, 0);
            }
            return toDataURL.apply(this, arguments);
        };

        console.log('✅ Identity Injection Complete. You are now invisible.');

    } catch (e) {
        console.error('❌ Injection Failed:', e);
    }
})();
