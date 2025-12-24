// 🎭 TIKHIVE INJECTOR v2.0 – Hybrid Spoof Engine
// يدعم التزوير الفوري + الجلب الاحتياطي + إخفاء البصمة

(async function() {
    const DEBUG = false;
    let fake = null;

    // 🚀 Load identity (Zero-latency or fallback)
    if (window.JOKER_IDENTITY) {
        fake = window.JOKER_IDENTITY;
        DEBUG && console.log('⚡ Identity loaded from window');
    } else if (localStorage.getItem('JOKER_IDENTITY')) {
        fake = JSON.parse(localStorage.getItem('JOKER_IDENTITY'));
        DEBUG && console.log('⚡ Identity loaded from cache');
    } else {
        try {
            const res = await fetch('/api/get-identity');
            const json = await res.json();
            if (json.success) {
                fake = json.data;
                localStorage.setItem('JOKER_IDENTITY', JSON.stringify(fake));
                DEBUG && console.log('📡 Identity fetched from server');
            }
        } catch (e) {
            console.warn('❌ Identity fetch failed', e);
        }
    }

    if (!fake) return console.warn('⚠️ No identity available.');

    try {
        // 🧠 WebGL Spoof
        const getParameterProxy = new Proxy(WebGLRenderingContext.prototype.getParameter, {
            apply: function(target, thisArg, args) {
                if (args[0] === 37445) return fake.vendor || "Google Inc.";
                if (args[0] === 37446) return fake.gpu_renderer || "NVIDIA GeForce RTX 3060";
                return Reflect.apply(target, thisArg, args);
            }
        });
        WebGLRenderingContext.prototype.getParameter = getParameterProxy;
        if (window.WebGL2RenderingContext) {
            WebGL2RenderingContext.prototype.getParameter = getParameterProxy;
        }

        // 🧬 Navigator Spoof
        const spoof = (obj, prop, val) => {
            Object.defineProperty(obj, prop, { get: () => val, configurable: true });
        };

        if (fake.cpu_cores) spoof(navigator, 'hardwareConcurrency', parseInt(fake.cpu_cores));
        if (fake.ram_size) spoof(navigator, 'deviceMemory', parseInt(fake.ram_size));
        if (fake.userAgent) spoof(navigator, 'userAgent', fake.userAgent);
        if (fake.platform) spoof(navigator, 'platform', fake.platform);
        if (fake.language) spoof(navigator, 'language', fake.language);
        if (fake.language) spoof(navigator, 'languages', [fake.language]);

        // 🌐 Timezone Spoof
        if (fake.timezone) {
            const original = Intl.DateTimeFormat;
            Intl.DateTimeFormat = function(...args) {
                const dtf = new original(...args);
                dtf.resolvedOptions = () => ({ timeZone: fake.timezone });
                return dtf;
            };
        }

        // 🖼️ Canvas Spoof
        if (fake.canvas_fp) {
            HTMLCanvasElement.prototype.toDataURL = function() {
                return fake.canvas_fp;
            };
        }

        // 🔊 AudioContext Spoof
        if (fake.audio_fp_noise) {
            const original = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function() {
                const data = original.apply(this, arguments);
                for (let i = 0; i < data.length; i++) {
                    data[i] += fake.audio_fp_noise;
                }
                return data;
            };
        }

        // 🧪 userAgentData Spoof
        if (navigator.userAgentData && fake.ua_data) {
            spoof(navigator, 'userAgentData', {
                brands: fake.ua_data.brands,
                mobile: fake.ua_data.mobile,
                platform: fake.ua_data.platform
            });
        }

        // 🕶️ Visibility Cloak
        spoof(document, 'hidden', false);
        spoof(document, 'visibilityState', 'visible');

        const originalAddEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
            if (['visibilitychange', 'webkitvisibilitychange', 'blur'].includes(type)) return;
            return originalAddEventListener.call(document, type, listener, options);
        };

        // 🧼 Anti-Detection: Hide Proxy traces
        const nativeToString = Function.prototype.toString;
        Function.prototype.toString = new Proxy(nativeToString, {
            apply: function(target, thisArg, args) {
                if (thisArg === getParameterProxy) return "function getParameter() { [native code] }";
                return target.apply(thisArg, args);
            }
        });

        DEBUG && console.table(fake);
        console.log(`%c🎭 Identity Applied: ${fake.gpu_renderer} [${fake.platform}]`, 'color: #4ade80;');

    } catch (e) {
        console.error("❌ Spoofing Error:", e);
    }
})();
