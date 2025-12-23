// 🤖 Humanizer Module: Simulating User Behavior
function startHumanBehavior() {
    console.log('👆 Humanizer Started...');
    
    // 1. Random Scrolling (تمرير عشوائي)
    setInterval(() => {
        const scrollAmount = Math.floor(Math.random() * 50) - 25; // للأعلى أو الأسفل
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }, 2000 + Math.random() * 3000); // كل 2-5 ثواني

    // 2. Mouse Move Simulation (حركة الماوس)
    setInterval(() => {
        const event = new MouseEvent('mousemove', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
        });
        document.dispatchEvent(event);
    }, 1500);
}

// تشغيل المحاكي عند تحميل الصفحة
window.addEventListener('load', startHumanBehavior);
