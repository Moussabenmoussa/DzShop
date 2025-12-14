const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// الاتصال بقاعدة البيانات
const mongoUri = process.env.MONGO_URI;
if (mongoUri) mongoose.connect(mongoUri).then(() => console.log('✅ DB Connected'));

// --- تخزين صفحات الهبوط (الأداة 1) ---
const Page = mongoose.model('Page', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object
}));

// --- تخزين متاجر الفيديو (الأداة 2) ---
const VidStore = mongoose.model('VidStore', new mongoose.Schema({
    slug: { type: String, unique: true },
    data: Object
}));

// --- المسارات الرئيسية ---

// الصفحة الرئيسية: أداة بناء الصفحات (builder.html)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'builder.html')));

// الصفحة الثانية: أداة بناء متاجر الفيديو (tool2.html)
app.get('/tool2', (req, res) => res.sendFile(path.join(__dirname, 'tool2.html')));


// --- (1) عمليات الأداة الأولى (LandShop) ---
app.post('/publish', async (req, res) => {
    try {
        await Page.findOneAndUpdate({ slug: req.body.slug }, { data: req.body }, { upsert: true, new: true });
        res.json({ success: true });
    } catch { res.json({ success: false }); }
});

app.get('/p/:slug', async (req, res) => {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).send('<h1 style="text-align:center;margin-top:50px">الصفحة غير موجودة (404)</h1>');

    const d = page.data;
    
    // === هذا هو نفس القالب الموجود في builder.html حرفياً (نسخ لصق) ===
    const jsonLd = { "@context": "https://schema.org/", "@type": "Product", "name": d.name, "image": d.imgs, "description": d.seo.desc, "offers": { "@type": "Offer", "priceCurrency": "DZD", "price": d.price, "availability": "https://schema.org/InStock" } };
    
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<title>${d.seo.title}</title>
<meta name="description" content="${d.seo.desc}">
<meta name="keywords" content="${d.seo.keys}">
<meta property="og:title" content="${d.seo.title}">
<meta property="og:description" content="${d.seo.desc}">
<meta property="og:image" content="${d.imgs[0]}">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>
<style>
body{font-family:'Tajawal',sans-serif;background:#fff}
.slide{display:none;width:100%;height:100%;object-fit:cover}.slide.active{display:block;animation:f 0.5s}@keyframes f{from{opacity:0.7}to{opacity:1}}
.opt{border:1px solid #e2e8f0;padding:6px 14px;border-radius:8px;cursor:pointer;background:#fff;font-size:13px;font-weight:700;color:#475569}.opt.active{background:#1e293b;color:#fff;border-color:#1e293b}
.col{width:32px;height:32px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #e2e8f0;cursor:pointer}.col.active{box-shadow:0 0 0 2px #1e293b;transform:scale(1.1)}
select{-webkit-appearance:none;appearance:none;background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 24 24'><polyline points='6 9 12 15 18 9'></polyline></svg>") no-repeat left 0.75rem center;background-size:1em;background-color:#fff}
.toast{position:fixed;top:20px;left:50%;transform:translate(-50%,-100px);background:#10b981;color:#fff;padding:12px 24px;border-radius:30px;transition:0.4s;z-index:9999;font-weight:700;box-shadow:0 10px 30px rgba(16,185,129,0.3);width:max-content}.toast.show{transform:translate(-50%,20px)}
@media(min-width:768px){body{background:#f1f5f9;padding-bottom:50px}.main-card{max-width:450px;margin:30px auto;border-radius:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.1);overflow:hidden;background:#fff;min-height:90vh}.sticky-nav{max-width:450px;margin:0 auto;border-radius:0 0 20px 20px}}
</style>
</head>
<body class="bg-gray-50 min-h-screen pb-24 md:pb-0">
<div class="main-card relative">
<div class="bg-red-600 text-white text-center py-2 text-xs font-bold sticky top-0 z-40 shadow-sm">⚡ عرض محدود: <span id="tm" class="bg-white/20 px-1 rounded mx-1">00:00:00</span></div>
<div class="relative h-[350px] bg-gray-100 group">
${d.imgs.map((m,i)=>`<img src="${m}" class="slide ${i==0?'active':''}" alt="${d.name}" ${i>0?'loading="lazy"':''}>`).join('')}
${d.imgs.length>1?`<button onclick="mv(-1)" class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 text-white rounded-full flex items-center justify-center backdrop-blur-sm">❮</button><button onclick="mv(1)" class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/30 text-white rounded-full flex items-center justify-center backdrop-blur-sm">❯</button>`:''}
</div>
<div class="p-6 -mt-8 bg-white relative z-20 rounded-t-[30px] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
<div class="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-4"></div>
<h1 class="text-2xl font-black text-slate-900 leading-snug mb-2">${d.name}</h1>
<div class="flex items-end gap-3 mb-6"><span class="text-4xl font-black text-red-600">${d.price}</span><span class="text-gray-400 line-through pb-1">${d.old||''}</span><span class="font-bold text-slate-800 pb-1">د.ج</span></div>
<div class="grid grid-cols-3 gap-2 mb-6">
<div class="bg-blue-50 p-2 rounded-lg text-center border border-blue-100"><i class="fas fa-truck text-blue-500 mb-1 block"></i><span class="text-[10px] font-bold text-blue-800">توصيل سريع</span></div>
<div class="bg-green-50 p-2 rounded-lg text-center border border-green-100"><i class="fas fa-money-bill-wave text-green-500 mb-1 block"></i><span class="text-[10px] font-bold text-green-800">عند الاستلام</span></div>
<div class="bg-purple-50 p-2 rounded-lg text-center border border-purple-100"><i class="fas fa-award text-purple-500 mb-1 block"></i><span class="text-[10px] font-bold text-purple-800">ضمان الجودة</span></div>
</div>
${d.sizes.length&&d.sizes[0]?`<div class="mb-4"><div class="text-xs font-bold mb-2 text-slate-700">المقاس:</div><div class="flex flex-wrap gap-2">${d.sizes.map((s,i)=>`<div class="opt ${i==0?'active':''}" onclick="sS(this,'${s.trim()}')">${s.trim()}</div>`).join('')}</div></div>`:''}
${d.colors.length&&d.colors[0]?`<div class="mb-4"><div class="text-xs font-bold mb-2 text-slate-700">اللون:</div><div class="flex gap-2">${d.colors.map((c,i)=>`<div class="col ${i==0?'active':''}" style="background:${c.trim()}" onclick="sC(this,'${c.trim()}')"></div>`).join('')}</div></div>`:''}
<div class="border-t border-gray-100 pt-5 mt-5"><h3 class="font-bold text-slate-900 mb-2 flex items-center gap-2"><i class="far fa-file-alt text-gray-400"></i> الوصف:</h3><p class="text-sm text-gray-600 whitespace-pre-line leading-7">${d.desc}</p></div>
<div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-8 pb-6" id="form">
<h2 class="text-center font-bold text-xl text-slate-800 mb-1">أطلب الآن!</h2><p class="text-center text-xs text-slate-500 mb-5">الدفع عند الاستلام</p>
<form onsubmit="sub(event)" class="space-y-3">
<div class="relative"><div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400"><i class="far fa-user"></i></div><input id="n" required placeholder="الاسم واللقب" class="w-full h-12 pr-10 pl-3 border border-gray-300 rounded-lg focus:border-red-500 outline-none transition bg-white"></div>
<div class="relative"><div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400"><i class="fas fa-phone-alt"></i></div><input id="p" required type="tel" placeholder="رقم الهاتف" class="w-full h-12 pr-10 pl-3 border border-gray-300 rounded-lg focus:border-red-500 outline-none transition bg-white text-right" dir="ltr"></div>
<select id="w" required class="w-full h-12 px-3 border border-gray-300 rounded-lg focus:border-red-500 outline-none transition bg-white text-gray-700" onchange="upC()"><option value="">اختر الولاية...</option>${d.wilayas.map(w=>`<option value="${w}">${w}</option>`).join('')}</select>
<select id="c" required class="w-full h-12 px-3 border border-gray-300 rounded-lg focus:border-red-500 outline-none transition bg-white text-gray-700" disabled><option value="">البلدية...</option></select>
</form></div><div class="h-10"></div></div>
<div class="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-50 sticky-nav shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
<button onclick="document.querySelector('form').requestSubmit()" id="btn" class="w-full ${d.conf.method=='whatsapp'?'bg-[#25D366] active:bg-[#128C7E]':'bg-red-600 active:bg-red-700'} text-white font-bold h-14 rounded-xl shadow-lg flex justify-center items-center gap-3 text-lg transition-transform active:scale-[0.98]">
<span>${d.conf.method=='whatsapp'?'اطلب عبر واتساب':'تأكيد الطلب الآن'}</span><i class="${d.conf.method=='whatsapp'?'fab fa-whatsapp text-2xl':'fas fa-arrow-left'}"></i></button>
</div></div><div id="tst" class="toast"><i class="fas fa-check-circle"></i> تم تسجيل طلبك بنجاح!</div>
<script>
let sz='${d.sizes[0]?d.sizes[0].trim():''}',cl='${d.colors[0]?d.colors[0].trim():''}';const CM=${JSON.stringify(d.communes)};
function sS(e,v){document.querySelectorAll('.opt').forEach(x=>x.classList.remove('active'));e.classList.add('active');sz=v}
function sC(e,v){document.querySelectorAll('.col').forEach(x=>x.classList.remove('active'));e.classList.add('active');cl=v}
function mv(d){let s=document.querySelectorAll('.slide'),c=0;s.forEach((e,i)=>{if(e.classList.contains('active'))c=i;e.classList.remove('active')});s[(c+d+s.length)%s.length].classList.add('active')}
function upC(){let w=document.getElementById('w').value,c=document.getElementById('c');c.innerHTML='<option value="">البلدية...</option>';if(CM[w]){CM[w].forEach(x=>c.innerHTML+='<option value="'+x+'">'+x+'</option>');c.disabled=0}else{c.innerHTML='<option value="المركز / غير محدد">المركز / غير محدد</option>';c.disabled=0}}
async function sub(e){e.preventDefault();let btn=document.getElementById('btn'),old=btn.innerHTML;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';btn.disabled=1;
let n=document.getElementById('n').value,p=document.getElementById('p').value,w=document.getElementById('w').value,c=document.getElementById('c').value,dt=[sz,cl].filter(Boolean).join('-'),tot=${d.price}+${d.conf.ship||0};
try{if('${d.conf.sheet}'){let f=new FormData();f.append('Date',new Date().toLocaleString());f.append('Name',n);f.append('Phone',p);f.append('Wilaya',w);f.append('Address',c);f.append('Product','${d.name}');f.append('Details',dt);fetch('${d.conf.sheet}',{method:'POST',body:f}).catch(()=>{})}
if('${d.conf.email}'&&'${d.conf.method}'!=='whatsapp'){await fetch('https://formsubmit.co/ajax/${d.conf.email}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({_subject:'طلب: ${d.name}',Name:n,Phone:p,Wilaya:w,Commune:c,Details:dt})})}
if('${d.conf.method}'!=='email'){window.location.href='https://wa.me/${d.conf.wa}?text='+encodeURIComponent('*طلب جديد*🔥\\n🛍️ ${d.name}\\n🎨 '+dt+'\\n💰 السعر: '+tot+'\\n👤 '+n+'\\n📱 '+p+'\\n📍 '+w+' - '+c)}
else{document.getElementById('tst').classList.add('show');btn.innerHTML=old;btn.disabled=0;document.querySelector('form').reset();setTimeout(()=>document.getElementById('tst').classList.remove('show'),3000)}}catch(e){alert('Error');btn.innerHTML=old;btn.disabled=0}}
setInterval(()=>{let d=new Date(),h=23-d.getHours(),m=59-d.getMinutes(),s=59-d.getSeconds();document.getElementById('tm').innerText=h+':'+m+':'+s},1000);
<\/script></body></html>`;

    res.send(html);
});


// --- (2) عمليات الأداة الثانية (VidShop) ---
app.post('/publish-vid', async (req, res) => {
    try {
        await VidStore.findOneAndUpdate(
            { slug: req.body.slug },
            { data: req.body.data },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.get('/v/:slug', async (req, res) => {
    const store = await VidStore.findOne({ slug: req.params.slug });
    if (!store) return res.status(404).send('<h1 style="text-align:center;margin-top:50px">المتجر غير موجود (404)</h1>');

    // نقرأ ملف tool2.html ونحقن فيه البيانات ليعمل كمتجر
    fs.readFile(path.join(__dirname, 'tool2.html'), 'utf8', (err, html) => {
        if (err) return res.status(500).send('Error');
        
        // نحقن البيانات في متغير window.STORE_DATA
        const injectedHtml = html.replace(
            '</head>',
            `<script>window.STORE_DATA = ${JSON.stringify(store.data)};</script></head>`
        );
        
        res.send(injectedHtml);
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('All Tools Running 🚀'));
