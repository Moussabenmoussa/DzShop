const { gotScraping } = require('got-scraping');

// هذه الأداة تتظاهر بأنها متصفح Chrome حديث
// وتقوم بتقليد "بصمة TLS" الخاصة به لتجاوز الحماية
const checkVideoLink = async (url) => {
    try {
        // إعدادات التنكر (Mimic Setup)
        const response = await gotScraping({
            url: url,
            method: 'GET',
            // هذه الإعدادات تجعل السيرفر يبدو كمتصفح حقيقي 100%
            headerGeneratorOptions: {
                browsers: [
                    { name: 'chrome', minVersion: 110 },
                    { name: 'firefox', minVersion: 110 },
                ],
                devices: ['desktop'], // الظهور ككمبيوتر لضمان الاستجابة
                locales: ['en-US'],
                operatingSystems: ['windows', 'linux'],
            },
            // مهلة زمنية (5 ثواني) لكي لا يعلق السيرفر
            timeout: { request: 5000 },
            // عدم تحميل محتوى الصفحة كاملاً (لتوفير السرعة)، نكتفي بالعناوين
            responseType: 'text' 
        });

        // إذا كان الرد 200 (OK)، فالرابط يعمل
        // تيك توك يعيد 200 حتى لو الفيديو محذوف أحياناً، لذا نحتاج لفحص ذكي
        if (response.statusCode === 200) {
            // فحص إضافي: هل الصفحة تحتوي على رسالة "Video not found"؟
            if (response.body.includes('Video currently unavailable') || response.body.includes('not found')) {
                return false;
            }
            return true;
        }
        return false;

    } catch (error) {
        console.error("BrowserMock Error:", error.message);
        // إذا كان الخطأ 404 فهذا يعني الفيديو غير موجود
        // إذا كان الخطأ timeout يعني السيرفر بطيء لكن الرابط غالباً صحيح
        return false;
    }
};

module.exports = { checkVideoLink };
