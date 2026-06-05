const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Parola123@cluster0.nbchjpc.mongodb.net/dunya_kupasi?retryWrites=true&w=majority';
mongoose.connect(uri);

const Tahmin = mongoose.model('Tahmin', new mongoose.Schema({ isim: { type: String, unique: true }, tahminler: Object, puan: { type: Number, default: 0 } }));
const Mac = mongoose.model('Mac', new mongoose.Schema({ tarih: String, isim: String, macId: { type: String, unique: true }, homeScore: { type: Number, default: 0 }, awayScore: { type: Number, default: 0 } }));

function hesapla(tH, tA, gH, gA) {
    tH = parseInt(tH); tA = parseInt(tA); gH = parseInt(gH); gA = parseInt(gA);
    // 1. Beraberlik ve Skor Doğru (7 Puan)
    if (tH === tA && gH === gA && tH === gH) return 7;
    // 2. Skoru ve Kazananı Doğru Bilmek (6 Puan)
    if (tH === gH && tA === gA) return 6;
    // 3. Beraberliği Bilmek (3 Puan)
    if (tH === tA && gH === gA) return 3;
    // 4. Kazananı Doğru Bilip, İki Takımdan Birinin Gol Sayısını Doğru Bilmek (3 Puan)
    let dogruKazanan = (tH > tA && gH > gA) || (tH < tA && gH < gA);
    if (dogruKazanan && (tH === gH || tA === gA)) return 3;
    // 5. Sadece Kazananı Bilmek (2 Puan)
    if (dogruKazanan) return 2;
    // 6. Kazananı Bilemeyip İki Takımdan Birinin Gol Sayısını Bilmek (1 Puan)
    if (tH === gH || tA === gA) return 1;
    return 0;
}

app.post('/api/tahmin-kaydet', async (req, res) => {
    const { isim, tahminler } = req.body;
    await Tahmin.findOneAndUpdate({ isim: isim }, { tahminler: tahminler }, { upsert: true });
    res.json({ mesaj: "Tahmin kaydedildi!" });
});

app.get('/api/maclar/:tarih', async (req, res) => {
    const maclar = await Mac.find({ tarih: req.params.tarih });
    res.json(maclar);
});

app.post('/api/admin/mac-ekle', async (req, res) => {
    if (req.body.sifre !== "ordu52") return res.status(403).send("Hatalı şifre!");
    await Mac.findOneAndUpdate({ macId: req.body.mac.macId }, req.body.mac, { upsert: true });
    res.json({ mesaj: "Maç eklendi!" });
});

app.post('/api/admin/skor-gir', async (req, res) => {
    if (req.body.sifre !== "ordu52") return res.status(403).send("Hatalı şifre!");
    const { macId, homeScore, awayScore } = req.body;
    await Mac.findOneAndUpdate({ macId }, { homeScore, awayScore });
    const tahminler = await Tahmin.find();
    for(let t of tahminler) {
        let yeniPuan = 0;
        for(let mId in t.tahminler) {
            let m = await Mac.findOne({ macId: mId });
            if(m) yeniPuan += hesapla(t.tahminler[mId].home, t.tahminler[mId].away, m.homeScore, m.awayScore);
        }
        await Tahmin.updateOne({ _id: t._id }, { puan: yeniPuan });
    }
    res.json({ mesaj: "Skor girildi ve puanlar güncellendi!" });
});

app.get('/api/puan-tablosu', async (req, res) => {
    const list = await Tahmin.find().sort({ puan: -1 });
    res.json(list);
});

app.listen(process.env.PORT || 3000);
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Parola123@cluster0.nbchjpc.mongodb.net/dunya_kupasi?retryWrites=true&w=majority';
mongoose.connect(uri);

const User = mongoose.model('User', new mongoose.Schema({ isim: { type: String, unique: true }, sifre: String, puan: { type: Number, default: 0 }, tahminler: Object }));
const Mac = mongoose.model('Mac', new mongoose.Schema({ tarih: String, isim: String, macId: { type: String, unique: true }, homeScore: { type: Number, default: 0 }, awayScore: { type: Number, default: 0 } }));

function hesapla(tH, tA, gH, gA) {
    tH = parseInt(tH); tA = parseInt(tA); gH = parseInt(gH); gA = parseInt(gA);
    if (tH === tA && gH === gA && tH === gH) return 7;
    if (tH === gH && tA === gA) return 6;
    if (tH === tA && gH === gA) return 3;
    let dogruKazanan = (tH > tA && gH > gA) || (tH < tA && gH < gA);
    if (dogruKazanan && (tH === gH || tA === gA)) return 3;
    if (dogruKazanan) return 2;
    if (tH === gH || tA === gA) return 1;
    return 0;
}

app.post('/api/kayit', async (req, res) => { try { await new User(req.body).save(); res.json({ mesaj: "Kayıt başarılı!" }); } catch { res.json({ mesaj: "Bu isim zaten var!" }); } });
app.post('/api/giris', async (req, res) => { const user = await User.findOne(req.body); res.json(user ? { basarili: true, isim: user.isim } : { basarili: false }); });
app.post('/api/tahmin-kaydet', async (req, res) => { await User.findOneAndUpdate({ isim: req.body.isim }, { tahminler: req.body.tahminler }); res.json({ mesaj: "Kaydedildi!" }); });
app.get('/api/maclar/:tarih', async (req, res) => { res.json(await Mac.find({ tarih: req.params.tarih })); });
app.get('/api/puan-tablosu', async (req, res) => { res.json(await User.find().sort({ puan: -1 })); });
app.post('/api/admin/mac-ekle', async (req, res) => { if (req.body.sifre !== "ordu52") return; await Mac.findOneAndUpdate({ macId: req.body.mac.macId }, req.body.mac, { upsert: true }); res.json({}); });
app.post('/api/admin/skor-gir', async (req, res) => {
    if (req.body.sifre !== "ordu52") return;
    await Mac.findOneAndUpdate({ macId: req.body.macId }, { homeScore: req.body.homeScore, awayScore: req.body.awayScore });
    const users = await User.find();
    for(let u of users) {
        let p = 0;
        for(let mId in u.tahminler) {
            let m = await Mac.findOne({ macId: mId });
            if(m) p += hesapla(u.tahminler[mId].home, u.tahminler[mId].away, m.homeScore, m.awayScore);
        }
        await User.updateOne({ _id: u._id }, { puan: p });
    }
    res.json({ mesaj: "Puanlar güncellendi!" });
});

app.listen(process.env.PORT || 3000);