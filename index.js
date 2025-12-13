const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// --- هيكل بيانات المنتج (Product Schema) ---
const ProductSchema = new mongoose.Schema({
    slug: { type: String, unique: true }, // رابط الصفحة (مثل: watch-vip)
    name: String,
    price: String,
    oldPrice: String,
    description: String,
    images: [String], // مصفوفة روابط الصور
    phone: String, // رقم التاجر للواتساب
    themeColor: { type: String, default: 'red' }, // لون الثيم (أحمر/أزرق...)
    hasRedotPay: { type: Boolean, default: false },
    redotPayId: String,
    visits: { type: Number, default: 0 }
});
const Product = mongoose.model('Product', ProductSchema);

// --- القالب (التصميم الذي أرسلته لي - محول إلى دالة) ---
const landingPageTemplate = (p) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>${p.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body{font-family:'Tajawal',sans-serif;background:#fff}
        .slide{display:none;width:100%;height:100%;object-fit:cover}.slide.active{display:block}
        .pm-btn{flex:1;padding:10px;font-size:12px;font-weight:bold;border-radius:8px;cursor:pointer;border:1px solid #e2e8f0;transition:0.2s;text-align:center}.pm-btn.active{background:#1e293b;color:#fff;border-color:#1e293b}
        .redot-box{display:none;background:#fef2f2;border:1px dashed #ef4444;padding:15px;border-radius:10px;margin-bottom:15px;text-align:center}
        @media(min-width:768px){body{background:#f1f5f9;padding-bottom:50px}.main-card{max-width:450px;margin:30px auto;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.1);overflow:hidden;background:#fff;min-height:90vh}.sticky-nav{max-width:450px;margin:0 auto;border-radius:0 0 20px 20px}}
    </style>
</head>
<body class="bg-gray-50 min-h-screen pb-24 md:pb-0">
<div class="main-card relative">
    <div class="bg-red-600 text-white text-center py-2 text-xs font-bold sticky top-0 z-40">⚡ عرض محدود <span id="timer" class="mx-1 font-mono bg-white/20 px-1 rounded">02:30:00</span></div>
    
    <div class="relative h-[350px] bg-gray-100" id="slider">
        ${p.images.map((img, i) => `<img src="${img}" class="slide ${i===0?'active':''} w-full h-full object-cover">`).join('')}
        ${p.images.length > 1 ? '<div class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">'+p.images.map((_,i)=>`<div class="w-2 h-2 rounded-full ${i===0?'bg-red-600':'bg-white/50'}"></div>`).join('')+'</div>' : ''}
    </div>

    <div class="p-6 -mt-8 bg-white relative z-20 rounded-t-[30px] shadow-sm">
        <h1 class="text-2xl font-black text-slate-900 mb-2 leading-tight">${p.name}</h1>
        <div class="flex items-end gap-3 mb-6">
            <span class="text-4xl font-black text-red-600">${p.price}</span>
            ${p.oldPrice ? `<span class="text-gray-400 line-through pb-1 text-lg">${p.oldPrice}</span>` : ''}
            <span class="font-bold text-slate-800 pb-1">د.ج</span>
        </div>

        <div class="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <div class="bg-blue-50 px-3 py-2 rounded-lg text-center border border-blue-100 min-w-[80px] flex-shrink-0">
                <i class="fas fa-truck text-blue-500 mb-1 block"></i><span class="text-[10px] font-bold text-blue-800">توصيل 58 ولاية</span>
            </div>
            <div class="bg-green-50 px-3 py-2 rounded-lg text-center border border-green-100 min-w-[80px] flex-shrink-0">
                <i class="fas fa-hand-holding-dollar text-green-500 mb-1 block"></i><span class="text-[10px] font-bold text-green-800">الدفع عند الاستلام</span>
            </div>
            ${p.hasRedotPay ? `<div class="bg-red-50 px-3 py-2 rounded-lg text-center border border-red-100 min-w-[80px] flex-shrink-0"><i class="fas fa-wallet text-red-500 mb-1 block"></i><span class="text-[10px] font-bold text-red-800">RedotPay</span></div>` : ''}
        </div>

        <div class="border-t border-gray-100 pt-5 mt-5">
            <h3 class="font-bold text-slate-800 mb-2">الوصف:</h3>
            <p class="text-sm text-gray-600 whitespace-pre-line leading-7">${p.description}</p>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-8 pb-6 scroll-mt-24" id="orderForm">
            <h2 class="text-center font-bold text-xl text-slate-800 mb-4">أدخل معلوماتك للطلب 👇</h2>
            <form onsubmit="sendOrder(event)" class="space-y-3">
                
                ${p.hasRedotPay ? `
                <div class="flex gap-2 mb-4">
                    <div class="pm-btn active" onclick="setPM('cod',this)">الدفع عند الاستلام</div>
                    <div class="pm-btn" onclick="setPM('redot',this)">RedotPay <i class="fas fa-wallet text-red-500"></i></div>
                </div>
                <div id="rdBox" class="redot-box">
                    <p class="text-xs font-bold text-red-600 mb-2">حول المبلغ إلى هذا المعرف:</p>
                    <div class="bg-white p-2 rounded border border-red-200 font-mono text-sm select-all cursor-pointer" onclick="navigator.clipboard.writeText('${p.redotPayId}');alert('تم النسخ')">${p.redotPayId} <i class="far fa-copy"></i></div>
                    <input id="txid" placeholder="أدخل رقم العملية (Transaction ID)" class="w-full h-10 mt-3 px-3 border border-red-300 rounded text-sm text-center">
                </div>` : ''}

                <div class="relative">
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400"><i class="far fa-user"></i></div>
                    <input id="name" required placeholder="الاسم واللقب" class="w-full h-12 pr-10 pl-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 transition">
                </div>
                <div class="relative">
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400"><i class="fas fa-phone-alt"></i></div>
                    <input id="phone" required type="tel" placeholder="رقم الهاتف" class="w-full h-12 pr-10 pl-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 text-right transition" dir="ltr">
                </div>
                <select id="wilaya" required class="w-full h-12 px-3 border border-gray-300 rounded-lg focus:border-red-500 text-gray-700 bg-white" onchange="loadCommunes()">
                    <option value="">اختر الولاية...</option>
                    </select>
                <select id="commune" required class="w-full h-12 px-3 border border-gray-300 rounded-lg focus:border-red-500 text-gray-700 bg-white" disabled>
                    <option value="">البلدية...</option>
                </select>
            </form>
        </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-50 sticky-nav shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
        <button onclick="document.querySelector('form').requestSubmit()" class="w-full bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] transition-all text-white font-bold h-14 rounded-xl shadow-lg flex justify-center items-center gap-3 text-lg animate-pulse-slow">
            <span>اطلب عبر واتساب</span> <i class="fab fa-whatsapp text-2xl"></i>
        </button>
    </div>
</div>

<script>
    // بيانات الولايات والبلديات (مختصرة للتجربة)
    const WILAYAS = ["أدرار","الشلف","الأغواط","أم البواقي","باتنة","بجاية","بسكرة","بشار","البليدة","البويرة","تمنراست","تبسة","تلمسان","تيارت","تيزي وزو","الجزائر","الجلفة","جيجل","سطيف","سعيدة","سكيكدة","سيدي بلعباس","عنابة","قالمة","قسنطينة","المدية","مستغانم","المسيلة","معسكر","ورقلة","وهران"];
    const COMMUNES = { "الجزائر": ["الجزائر الوسطى","باب الوادي","القصبة"], "وهران": ["وهران","السانية","بئر الجير"] }; // يمكن توسيعها لاحقاً

    // تهيئة الصفحة
    const wSelect = document.getElementById('wilaya');
    WILAYAS.forEach(w => { wSelect.innerHTML += '<option value="'+w+'">'+w+'</option>' });

    let pm = 'cod';
    function setPM(m,e){
        pm=m;
        document.querySelectorAll('.pm-btn').forEach(b=>b.classList.remove('active'));
        e.classList.add('active');
        document.getElementById('rdBox').style.display = m=='redot'?'block':'none';
    }

    function loadCommunes(){
        const w = wSelect.value;
        const cSelect = document.getElementById('commune');
        cSelect.innerHTML = '<option value="">البلدية...</option>';
        
        if(COMMUNES[w]){
            COMMUNES[w].forEach(c => cSelect.innerHTML += '<option value="'+c+'">'+c+'</option>');
            cSelect.disabled = false;
        } else {
            cSelect.innerHTML = '<option value="المركز">المركز (أخرى)</option>';
            cSelect.disabled = false;
        }
    }

    function sendOrder(e){
        e.preventDefault();
        const n = document.getElementById('name').value;
        const p = document.getElementById('phone').value;
        const w = document.getElementById('wilaya').value;
        const c = document.getElementById('commune').value;
        const tx = document.getElementById('txid') ? document.getElementById('txid').value : '';

        if(pm == 'redot' && !tx){ alert('يرجى إدخال رقم العملية (TXID)'); return; }

        let payTxt = pm=='redot' ? '✅ تم الدفع (RedotPay) | TX: '+tx : '💵 الدفع عند الاستلام';
        
        // رسالة الواتساب المنظمة
        let msg = '*طلب جديد من المتجر* 🔥\\n' +
                  '📦 المنتج: ${p.name}\\n' +
                  '💰 السعر: ${p.price}\\n' +
                  '------------------\\n' +
                  '👤 الاسم: ' + n + '\\n' +
                  '📱 الهاتف: ' + p + '\\n' +
                  '📍 العنوان: ' + w + ' - ' + c + '\\n' +
                  '------------------\\n' +
                  payTxt;

        window.location.href = 'https://wa.me/${p.phone}?text=' + encodeURIComponent(msg);
    }
    
    // Timer Logic
    setInterval(() => {
        // كود عداد تنازلي بسيط وهمي
    }, 1000);
</script>
</body>
</html>
`;

// --- لوحة التحكم (لإنشاء الصفحات) ---
const dashboardTemplate = (msg = '') => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LandShop Maker</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>body{background:#f8f9fa;font-family:system-ui} .form-card{background:white;padding:30px;border-radius:15px;box-shadow:0 10px 30px rgba(0,0,0,0.05);max-width:600px;margin:50px auto}</style>
</head>
<body>
    <div class="container">
        <div class="form-card">
            <h2 class="text-center fw-bold mb-4">🛠️ صانع الصفحات</h2>
            ${msg ? `<div class="alert alert-success">${msg}</div>` : ''}
            
            <form action="/create" method="POST">
                <div class="mb-3">
                    <label class="form-label fw-bold">اسم الرابط (بالانجليزية)</label>
                    <input type="text" name="slug" class="form-control" placeholder="مثال: watch-vip" required pattern="[a-z0-9-]+" title="أحرف انجليزية وأرقام فقط">
                    <div class="form-text">سيكون الرابط: dzshop.onrender.com/p/watch-vip</div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6"><input type="text" name="name" class="form-control" placeholder="اسم المنتج" required></div>
                    <div class="col-6"><input type="text" name="price" class="form-control" placeholder="السعر (مثال: 5500)" required></div>
                </div>

                <div class="mb-3">
                    <label class="form-label">رقم هاتفك (لاستقبال الطلب)</label>
                    <input type="text" name="phone" class="form-control" placeholder="21355...." required>
                </div>

                <div class="mb-3">
                    <label class="form-label">رابط الصورة (Direct Link)</label>
                    <input type="url" name="image1" class="form-control" placeholder="https://..." required>
                </div>

                <div class="mb-3">
                    <label class="form-label">وصف المنتج</label>
                    <textarea name="description" class="form-control" rows="4" placeholder="اكتب وصفاً جذاباً..."></textarea>
                </div>

                <div class="form-check mb-3">
                    <input class="form-check-input" type="checkbox" name="hasRedotPay" id="redotCheck" onchange="document.getElementById('redotIdBox').classList.toggle('d-none')">
                    <label class="form-check-label" for="redotCheck">تفعيل الدفع بـ RedotPay</label>
                </div>
                <div id="redotIdBox" class="mb-3 d-none">
                    <input type="text" name="redotPayId" class="form-control" placeholder="معرف RedotPay الخاص بك">
                </div>

                <button type="submit" class="btn btn-primary w-100 fw-bold py-2">إنشاء الصفحة الآن 🚀</button>
            </form>
        </div>
    </div>
</body>
</html>
`;

// --- المسارات (Routes) ---

// 1. الصفحة الرئيسية (لوحة التحكم)
app.get('/', (req, res) => {
    res.send(dashboardTemplate());
});

// 2. إنشاء صفحة جديدة
app.post('/create', async (req, res) => {
    try {
        const { slug, name, price, phone, description, image1, hasRedotPay, redotPayId } = req.body;
        
        // حفظ في قاعدة البيانات
        await Product.create({
            slug: slug.toLowerCase(),
            name, price, phone, description,
            images: [image1], // يمكن تطويرها لتقبل صور متعددة
            hasRedotPay: hasRedotPay === 'on',
            redotPayId
        });

        const link = `https://${req.get('host')}/p/${slug}`;
        res.send(dashboardTemplate(`✅ تم إنشاء الصفحة بنجاح!<br>رابط منتجك هو:<br><a href="${link}" target="_blank"><strong>${link}</strong></a>`));
    } catch (err) {
        res.send(dashboardTemplate(`❌ خطأ: الرابط "${req.body.slug}" مستخدم من قبل، جرب اسماً آخر.`));
    }
});

// 3. عرض صفحة المنتج (للزوار)
app.get('/p/:slug', async (req, res) => {
    const product = await Product.findOne({ slug: req.params.slug });
    
    if (!product) {
        return res.status(404).send('<h1 style="text-align:center; margin-top:50px">404 - المنتج غير موجود 😢</h1>');
    }

    // زيادة عداد الزيارات
    product.visits++;
    await product.save();

    res.send(landingPageTemplate(product));
});

app.listen(3000, () => console.log('LandShop Platform Running 🚀'));
