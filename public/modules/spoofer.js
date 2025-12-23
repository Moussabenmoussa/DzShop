// 🛡️ Spoofer Module: Anti-Fingerprinting
(function() {
    console.log('👻 Spoofer Active: Masking Device Identity...');

    // 1. Canvas Noise Injection (تزوير كرت الشاشة)
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
        const context = this.getContext('2d');
        if (context) {
            const shift = Math.floor(Math.random() * 10) - 5;
            const imageData = context.getImageData(0, 0, 1, 1); // نأخذ بكسل واحد
            imageData.data[0] = imageData.data[0] + shift; // نغير لونه قليلاً
            context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
    };

    // 2. AudioContext Noise (تزوير كرت الصوت)
    const origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function() {
        const results = origGetChannelData.apply(this, arguments);
        for (let i = 0; i < results.length; i+=100) {
            results[i] += Math.random() * 0.0000001; // تشويش مجهري
        }
        return results;
    };

    // 3. Timezone Mocking (تثبيت التوقيت)
    // نجبر المتصفح أن يبلغ عن توقيت ثابت لمنع كشف الـ IP المختلف
    const originalDate = Date;
    // (يمكن تطوير هذا الجزء ليتناسب مع الـ IP القادم من السيرفر)
})();
