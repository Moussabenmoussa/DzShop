router.get('/next-video', isAuth, async (req, res) => {
    try {
        // 1. فحص هل قاعدة البيانات فارغة تماماً؟
        const count = await Video.countDocuments();
        if (count === 0) {
            return res.json({ success: false, message: 'قاعدة البيانات فارغة! (0 videos)' });
        }

        // 2. جلب "أي" فيديو موجود بدون أي شروط (فقط للتجربة)
        const video = await Video.findOne(); 

        // 3. إرسال الفيديو
        if (video) {
            console.log("تم العثور على فيديو:", video); // سيظهر هذا في السجلات
            res.json({ 
                success: true, 
                video: video,
                debugMessage: "هذا وضع اختبار - تم جلب الفيديو بدون شروط"
            });
        } else {
            res.json({ success: false, message: 'خطأ غريب: العدد موجود لكن لم يتم جلب الفيديو' });
        }

    } catch (e) {
        console.error("Test Error:", e);
        res.json({ success: false, message: e.message });
    }
});
