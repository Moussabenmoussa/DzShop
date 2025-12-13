const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الاتصال بقاعدة البيانات
const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// هيكل البيانات (نفس هيكل كودك بالضبط)
const PageSchema = new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object // سنحفظ كائن البيانات 'd' كما هو
});
const Page = mongoose.model('Page', PageSchema);

// 1. الرئيسية: عرض أداة البناء (Builder)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'builder.html'));
});

// 2. عملية النشر: حفظ البيانات في القاعدة
app.post('/publish', async (req, res) => {
    try {
        const { slug, ...otherData } = req.body;
        // تحديث إذا كان موجود، أو إنشاء جديد
        await Page.findOneAndUpdate(
            { slug: slug },
            { slug: slug, data: req.body }, // نحفظ البيانات كاملة
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: "اسم الرابط مستخدم أو غير صالح" });
    }
});

// 3. عرض صفحة الهبوط النهائية (Dynamic)
app.get('/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    
    if (!page) return res.status(404).send('<h1>404 - المتجر غير موجود</h1>');

    const d = page.data; // استرجاع بياناتك الأصلية

    // --- هنا نضع قالب HTML النهائي (نفس كودك الأصلي للنتيجة) ---
    // قمت بتحويل كود المعاينة الخاص بك إلى قالب Node.js
    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<title>${d.name}</title>
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
<div class="bg-red-600 text-white text-center py-2 text-xs font-bold sticky top-0 z-40">⚡ عرض محدود <span class="bg-white/20 px-1 rounded mx-1">02:30:00</span></div>
<div class="relative h-[350px] bg-gray-100">
${d.imgs.map((m,i)=>`<img src="${m}" class="slide ${i==0?'active':''}">`).join('')}
</div>
<div class="p-6 -mt-8 bg-white relative z-20 rounded-t-[30px] shadow-sm">
<h1 class="text-2xl font-black text-slate-900 mb-2">${d.name}</h1>
<div class="flex items-end gap-3 mb-6"><span class="text-4xl font-black text-red-600">${d.price}</span><span class="text-gray-400 line-through pb-1">${d.old||''}</span><span class="font-bold text-slate-800 pb-1">د.ج</span></div>
<div class="flex gap-2 mb-6 overflow-x-auto">
<div class="bg-blue-50 px-3 py-2 rounded-lg text-center border border-blue-100 min-w-[80px]"><i class="fas fa-truck text-blue-500 mb-1 block"></i><span class="text-[10px] font-bold text-blue-800">توصيل سريع</span></div>
<div class="bg-green-50 px-3 py-2 rounded-lg text-center border border-green-100 min-w-[80px]"><i class="fas fa-hand-holding-dollar text-green-500 mb-1 block"></i><span class="text-[10px] font-bold text-green-800">الدفع عند الاستلام</span></div>
${d.redot.active?`<div class="bg-red-50 px-3 py-2 rounded-lg text-center border border-red-100 min-w-[80px]"><i class="fas fa-wallet text-red-500 mb-1 block"></i><span class="text-[10px] font-bold text-red-800">RedotPay</span></div>`:''}
</div>
<div class="border-t border-gray-100 pt-5 mt-5"><p class="text-sm text-gray-600 whitespace-pre-line leading-7">${d.desc}</p></div>

<div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-8 pb-6">
<h2 class="text-center font-bold text-xl text-slate-800 mb-4">أدخل معلوماتك للطلب</h2>

<form onsubmit="sub(event)" class="space-y-3">
${d.redot.active?`<div class="flex gap-2 mb-4">
<div class="pm-btn active" onclick="setPM('cod',this)">الدفع عند الاستلام</div>
<div class="pm-btn" onclick="setPM('redot',this)">RedotPay <i class="fas fa-wallet text-red-500"></i></div>
</div>`:''}

<div id="rdBox" class="redot-box">
<p class="text-xs font-bold text-red-600 mb-2">قم بالتحويل إلى المعرف التالي:</p>
<div class="bg-white p-2 rounded border border-red-200 font-mono text-sm select-all cursor-pointer" onclick="navigator.clipboard.writeText('${d.redot.id}');alert('تم النسخ')">${d.redot.id} <i class="far fa-copy"></i></div>
${d.redot.qr?`<img src="${d.redot.qr}" class="w-32 h-32 mx-auto mt-2 border border-gray-200 rounded">`:''}
<input id="txid" placeholder="أدخل رقم العملية (Transaction ID)" class="w-full h-10 mt-3 px-3 border border-red-300 rounded text-sm text-center">
</div>

<div class="relative"><div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400"><i class="far fa-user"></i></div><input id="n" required placeholder="الاسم واللقب" class="w-full h-12 pr-10 pl-3 border border-gray-300 rounded-lg focus:border-red-500"></div>
<div class="relative"><div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400"><i class="fas fa-phone-alt"></i></div><input id="p" required type="tel" placeholder="رقم الهاتف" class="w-full h-12 pr-10 pl-3 border border-gray-300 rounded-lg focus:border-red-500 text-right" dir="ltr"></div>
<select id="w" required class="w-full h-12 px-3 border border-gray-300 rounded-lg focus:border-red-500 text-gray-700" onchange="upC()"><option value="">اختر الولاية...</option>${d.wilayas.map(w=>`<option value="${w}">${w}</option>`).join('')}</select>
<select id="c" required class="w-full h-12 px-3 border border-gray-300 rounded-lg focus:border-red-500 text-gray-700" disabled><option value="">البلدية...</option></select>
</form></div></div>

<div class="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-50 sticky-nav shadow-lg">
<button onclick="document.querySelector('form').requestSubmit()" id="btn" class="w-full ${d.conf.method=='whatsapp'?'bg-[#25D366] active:bg-[#128C7E]':'bg-red-600 active:bg-red-700'} text-white font-bold h-14 rounded-xl shadow-lg flex justify-center items-center gap-3 text-lg">
<span>${d.conf.method=='whatsapp'?'اطلب عبر واتساب':'تأكيد الطلب الآن'}</span><i class="${d.conf.method=='whatsapp'?'fab fa-whatsapp text-2xl':'fas fa-arrow-left'}"></i></button>
</div></div>

<script>
let pm = 'cod';
// نمرر البيانات المحفوظة للواجهة
const CM = ${JSON.stringify(d.communes)};
function setPM(m,e){pm=m;document.querySelectorAll('.pm-btn').forEach(b=>b.classList.remove('active'));e.classList.add('active');document.getElementById('rdBox').style.display=m=='redot'?'block':'none'}
function upC(){let w=document.getElementById('w').value,c=document.getElementById('c');c.innerHTML='<option value="">البلدية...</option>';if(CM[w]){CM[w].forEach(x=>c.innerHTML+='<option value="'+x+'">'+x+'</option>');c.disabled=0}else{c.innerHTML='<option value="المركز / غير محدد">المركز / غير محدد</option>';c.disabled=0}}
async function sub(e){e.preventDefault();
let n=document.getElementById('n').value,p=document.getElementById('p').value,w=document.getElementById('w').value,c=document.getElementById('c').value,tx=document.getElementById('txid').value;
if(pm=='redot' && !tx){alert('يرجى إدخال رقم العملية (Transaction ID) لتأكيد الدفع');return}
let payTxt = pm=='redot' ? '✅ مدفوع (RedotPay)\\n🆔 TXID: '+tx : '💵 الدفع عند الاستلام';
let msg = '*طلب جديد*🔥\\n🛍️ ${d.name}\\n💰 السعر: ${d.price}\\n'+payTxt+'\\n👤 '+n+'\\n👤 '+p+'\\n📍 '+w+' - '+c;
if('${d.conf.sheet}'){let f=new FormData();f.append('Date',new Date().toLocaleString());f.append('Name',n);f.append('Phone',p);f.append('Wilaya',w);f.append('Address',c);f.append('Payment',pm=='redot'?tx:'COD');fetch('${d.conf.sheet}',{method:'POST',body:f}).catch(()=>{})}
if('${d.conf.method}'!=='email'){window.location.href='https://wa.me/${d.conf.wa}?text='+encodeURIComponent(msg)}
else{alert('تم تسجيل الطلب');document.querySelector('form').reset()}}
</script></body></html>
    `;

    res.send(html);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Builder Running'));
