<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تفاصيل الخدمة</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>body { font-family: 'Cairo', sans-serif; background: #f5f5f5; }</style>
</head>
<body>

    <div class="fixed top-0 w-full bg-white h-14 border-b flex items-center px-4 justify-between z-40">
        <button onclick="history.back()"><i class="fas fa-arrow-right"></i></button>
        <span class="font-bold">تفاصيل</span>
        <button onclick="window.location.href='/'"><i class="fas fa-home"></i></button>
    </div>

    <div class="pt-16 px-4 pb-20">
        <img id="pImg" src="" class="w-full h-64 object-cover rounded-xl mb-4 bg-gray-200">
        <h1 id="pTitle" class="text-xl font-black mb-2">...</h1>
        <div class="text-2xl font-black text-red-600 mb-4"><span id="pPrice">0</span> $</div>
        
        <div class="bg-white p-4 rounded-xl border mb-4 flex items-center gap-3">
            <img id="sAvatar" src="" class="w-12 h-12 rounded-full bg-gray-200">
            <div>
                <div class="font-bold text-sm" id="sName">...</div>
                <div class="text-xs text-gray-500">بائع</div>
            </div>
        </div>

        <div class="bg-white p-4 rounded-xl border">
            <h3 class="font-bold mb-2">الوصف</h3>
            <p id="pDesc" class="text-gray-600 text-sm whitespace-pre-line">...</p>
        </div>
    </div>

    <div class="fixed bottom-0 w-full bg-white p-3 border-t flex gap-3">
        <button onclick="startChat()" class="flex-1 bg-black text-white py-3 rounded-xl font-bold shadow-lg">
            <i class="fas fa-comments mr-2"></i> تواصل للتفاوض
        </button>
    </div>

    <script>
        const id = window.location.pathname.split('/').pop();
        let sellerId = null;

        window.onload = async () => {
            const res = await fetch(`/api/public/product/${id}`);
            const d = await res.json();
            
            if (d._id) {
                document.getElementById('pTitle').innerText = d.title;
                document.getElementById('pPrice').innerText = d.price;
                document.getElementById('pDesc').innerText = d.desc || 'لا يوجد وصف';
                document.getElementById('pImg').src = d.image || 'https://via.placeholder.com/300';
                
                if (d.seller) {
                    sellerId = d.seller._id;
                    document.getElementById('sName').innerText = d.seller.name;
                    document.getElementById('sAvatar').src = d.seller.avatar || 'https://via.placeholder.com/50';
                }
            }
        };

        async function startChat() {
            const userStr = localStorage.getItem('dz_user');
            if (!userStr) {
                alert('يجب عليك تسجيل الدخول أولاً');
                window.location.href = '/';
                return;
            }
            const user = JSON.parse(userStr);
            
            if (user._id === sellerId) return alert('لا يمكنك التفاوض مع نفسك');

            try {
                const res = await fetch('/api/chat/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ buyerId: user._id, sellerId, listingId: id })
                });
                const d = await res.json();
                if (d.success) {
                    // توجيه إلى الداشبورد مع كود الشات
                    window.location.href = '/#chat=' + d.chatId;
                }
            } catch(e) { alert('خطأ'); }
        }
    </script>
</body>
</html>
