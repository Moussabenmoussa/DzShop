/**
 * 🤖 Humanizer Pro V2 - Safe Edition
 * يحاكي السلوك البشري (تمرير، تحويم، تركيز) دون مغادرة الصفحة.
 */

window.addEventListener("load", function() {
    console.log("👆 Humanizer Pro V2 (Safe Mode) Started");

    // 1. تمرير ذكي (ينزل ببطء كأنه يقرأ، ثم يعود قليلاً)
    function scrollHuman() {
        const direction = Math.random() > 0.3 ? 1 : -1; // 70% نزول، 30% صعود
        const distance = Math.floor(Math.random() * 100) + 50;
        
        window.scrollBy({
            top: distance * direction,
            behavior: "smooth"
        });
    }

    // 2. تحويم الماوس (Hover) بدلاً من الضغط
    // هذا يوهم الموقع أن المستخدم مهتم بالعناصر لكن لا يغادر الصفحة
    function hoverSmart() {
        const elements = document.querySelectorAll("a, button, video, .video-player");
        if (elements.length) {
            const el = elements[Math.floor(Math.random() * elements.length)];
            
            // محاكاة دخول الماوس على العنصر
            const event = new MouseEvent('mouseover', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            });
            el.dispatchEvent(event);
            
            // أحياناً نقوم بالتركيز عليه (Focus)
            if(Math.random() > 0.5) el.focus();
            
            console.log("👀 Hovered element:", el.tagName);
        }
    }

    // 3. حركة ماوس انسيابية (Bezier Curve Simulation - Simplified)
    // نحرك الماوس خطوات صغيرة بدلاً من القفز
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    function moveMouseSmooth() {
        // تحريك مسافة صغيرة عشوائية
        const moveX = (Math.random() * 40) - 20; 
        const moveY = (Math.random() * 40) - 20;

        mouseX += moveX;
        mouseY += moveY;

        // التأكد من البقاء داخل الشاشة
        mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
        mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));

        const event = new MouseEvent("mousemove", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: mouseX,
            clientY: mouseY
        });
        document.dispatchEvent(event);
    }

    // 4. محاكاة التفاعل مع الفيديو (لضمان عدم النوم)
    function wakeUpVideo() {
        window.dispatchEvent(new Event('mousemove'));
        window.dispatchEvent(new Event('mousedown'));
        setTimeout(() => window.dispatchEvent(new Event('mouseup')), 100);
    }

    // --- الجداول الزمنية (Timers) ---
    
    // تمرير الصفحة كل 3-6 ثواني
    setInterval(scrollHuman, Math.random() * 3000 + 3000);

    // تحريك الماوس كل ثانية (بشكل ناعم)
    setInterval(moveMouseSmooth, 1000);

    // التحويم على العناصر كل 4-8 ثواني
    setInterval(hoverSmart, Math.random() * 4000 + 4000);

    // "وخز" الصفحة لتبقى مستيقظة كل 10 ثواني
    setInterval(wakeUpVideo, 10000);
});
