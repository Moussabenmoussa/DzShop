// 🕵️ Harvester Agent: Collects Real Device Fingerprints
(async function() {
    console.log('📡 Harvester: Analyzing device environment...');

    // 1. استخراج بصمة الـ Canvas (توقيع كرت الشاشة)
    function getCanvasFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;
        
        // رسم أشكال معقدة تختلف من كرت شاشة لآخر
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("TikHive_Fingerprint_v1", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("TikHive_Fingerprint_v1", 4, 17);
        
        // استخراج الـ Hash من الصورة الناتجة
        const dataURI = canvas.toDataURL();
        
        // تحويل النص الطويل إلى Hash قصير
        let hash = 0;
        if (dataURI.length === 0) return hash;
        for (let i = 0; i < dataURI.length; i++) {
            const char = dataURI.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // 2. استخراج معلومات WebGL (اسم كرت الشاشة الحقيقي)
    function getWebGLInfo() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { vendor: 'Unknown', renderer: 'Unknown' };

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            return {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            };
        }
        return { vendor: 'Generic', renderer: 'Generic' };
    }

    // 3. تجميع البيانات
    try {
        const webgl = getWebGLInfo();
        const canvasHash = getCanvasFingerprint();

        const fingerprintData = {
            os: navigator.platform, // سيتم تحسين تصنيف الـ OS في السيرفر لاحقاً
            browser: getBrowserName(), // دالة بسيطة لاستخراج الاسم
            deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelRatio: window.devicePixelRatio || 1
            },
            
            hardware: {
                concurrency: navigator.hardwareConcurrency || 2,
                memory: navigator.deviceMemory || 4,
                vendor: webgl.vendor,
                renderer: webgl.renderer
            },

            canvasHash: canvasHash,
            audioHash: "pending_v2", // سنضيف بصمة الصوت لاحقاً لتخفيف الكود حالياً
            userAgent: navigator.userAgent
        };

        // 4. الإرسال للسيرفر
        const response = await fetch('/api/harvest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fingerprintData)
        });

        const result = await response.json();
        if(result.success) {
            console.log('✅ Harvester: Identity secured in vault.');
        } else {
            console.log('⚠️ Harvester: ' + result.message);
        }

    } catch (e) {
        console.error('❌ Harvester Error:', e);
    }

    // دالة مساعدة بسيطة لمعرفة المتصفح
    function getBrowserName() {
        const agent = navigator.userAgent.toLowerCase();
        if (agent.includes('chrome')) return 'Chrome';
        if (agent.includes('firefox')) return 'Firefox';
        if (agent.includes('safari')) return 'Safari';
        if (agent.includes('edge')) return 'Edge';
        return 'Other';
    }

})();
