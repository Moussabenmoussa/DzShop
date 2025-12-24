// 🎭 TIKHIVE INJECTOR: Hybrid Mode (Identity + Nuclear Cloak + WebRTC + Battery + MediaDevices)

(async function() {
    let fake = null;

    // ⚡ 1. جلب الهوية (الحقن الفوري أو عبر الشبكة)
    if (window.JOKER_IDENTITY) {
        console.log('%c⚡ JOKER: Zero-Latency Injection Active!', 'color: #facc15; font-weight: bold;');
        fake = window.JOKER_IDENTITY;
    } else {
        try {
            const response = await fetch('/api/get-identity');
            const result = await response.json();
            if (result.success) fake = result.data;
        } catch (e) {}
    }

    if (!fake) {
        console.warn('⚠️ No identity to inject.');
        return;
    }

    try {
        // ==========================================
        // 🎭 A. تزوير الهوية (Identity Spoofing)
        // ==========================================

        // تزوير WebGL (كرت الشاشة)
        const getParameterProxy = new Proxy(WebGLRenderingContext.prototype.getParameter, {
            apply: function(target, thisArg, args) {
                if (args[0] === 37445) return fake.vendor || "Google Inc. (NVIDIA)";
                if (args[0] === 37446) return fake.gpu_renderer || "NVIDIA GeForce RTX 3060";
                return Reflect.apply(target, thisArg, args);
            }
        });
        WebGLRenderingContext.prototype.getParameter = getParameterProxy;
        if (window.WebGL2RenderingContext) {
            WebGL2RenderingContext.prototype.getParameter = getParameterProxy;
        }

        // تزوير CPU & RAM & UA & Platform
        if (fake.cpu_cores) Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => parseInt(fake.cpu_cores), configurable: true });
        if (fake.ram_size) Object.defineProperty(navigator, 'deviceMemory', { get: () => parseInt(fake.ram_size), configurable: true });
        if (fake.userAgent) Object.defineProperty(navigator, 'userAgent', { get: () => fake.userAgent, configurable: true });
        if (fake.platform) Object.defineProperty(navigator, 'platform', { get: () => fake.platform, configurable: true });

        // تزوير اللغة
        if (fake.language) {
            Object.defineProperty(navigator, 'language', { get: () => fake.language, configurable: true });
            Object.defineProperty(navigator, 'languages', { get: () => [fake.language], configurable: true });
        }

        // ==========================================
        // 🛡️ B. عباءة التخفي النووية (Nuclear Visibility Cloak)
        // ==========================================

        Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
        document.hasFocus = () => true;

        const originalAddEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
            const blockedEvents = [
                'visibilitychange', 'webkitvisibilitychange', 'blur', 'focusout',
                'pagehide', 'beforeunload', 'unload', 'mouseleave', 'mouseout'
            ];
            if (blockedEvents.includes(type)) return;
            return originalAddEventListener.call(this, type, listener, options);
        };

        window.addEventListener = new Proxy(window.addEventListener, {
            apply(target, thisArg, args) {
                const [type] = args;
                if (['blur', 'focus', 'visibilitychange'].includes(type)) return;
                return Reflect.apply(target, thisArg, args);
            }
        });

        Object.defineProperty(document, 'activeElement', {
            get: () => document.body,
            configurable: true
        });

        if ('connection' in navigator) {
            try {
                Object.defineProperty(navigator.connection, 'saveData', { get: () => false });
                Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
                Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 });
                Object.defineProperty(navigator.connection, 'downlink', { get: () => 10 });
            } catch (e) {}
        }

        let lastRAF = Date.now();
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function(callback) {
            return originalRAF.call(window, function(timestamp) {
                lastRAF = Date.now();
                callback(timestamp);
            });
        };
        setInterval(() => {
            if (Date.now() - lastRAF > 2000) {
                window.dispatchEvent(new Event('mousemove'));
            }
        }, 2000);

        // ==========================================
        // 🧪 C. طبقات التمويه الإضافية (WebRTC + Battery + MediaDevices)
        // ==========================================

        // Battery API
        if ('getBattery' in navigator) {
            navigator.getBattery = async () => ({
                charging: true,
                chargingTime: 0,
                dischargingTime: Infinity,
                level: 0.99,
                onchargingchange: null,
                onchargingtimechange: null,
                ondischargingtimechange: null,
                onlevelchange: null
            });
        }

        // WebRTC
        const originalRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
        if (originalRTCPeerConnection) {
            const newRTCPeerConnection = function(...args) {
                const pc = new originalRTCPeerConnection(...args);
                const originalAddIceCandidate = pc.addIceCandidate;
                pc.addIceCandidate = function(candidate) {
                    if (candidate && candidate.candidate && candidate.candidate.includes("typ srflx")) {
                        return Promise.resolve();
                    }
                    return originalAddIceCandidate.call(this, candidate);
                };
                return pc;
            };
            window.RTCPeerConnection = newRTCPeerConnection;
            window.webkitRTCPeerConnection = newRTCPeerConnection;
        }

        // MediaDevices
        if (navigator.mediaDevices) {
            navigator.mediaDevices.enumerateDevices = async () => ([
                {
                    kind: "videoinput",
                    label: "Integrated Camera",
                    deviceId: "default",
                    groupId: "camera-group"
                },
                {
                    kind: "audioinput",
                    label: "Built-in Microphone",
                    deviceId: "default",
                    groupId: "mic-group"
                }
            ]);
        }

        console.log(`%c🎭 JOKER ACTIVE: ${fake.gpu_renderer} | 🛡️ CLOAK: Nuclear + WebRTC + Battery + Media`, 'color: #4ade80; font-weight: bold;');

    } catch (e) {
        console.error("Spoofer Error:", e);
    }
})();
