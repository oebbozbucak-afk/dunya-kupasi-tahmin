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
    // Yeni kurallar
    if (tH === tA && gH === gA && tH === gH) return 7; // Beraberlik ve skor doğru
    if (tH === gH && tA === gA) return 6;             // Skor ve kazanan doğru
    if (tH === tA && gH === gA) return 3;             // Beraberliği bilmek
    let dogruKazanan = (tH > tA && gH > gA) || (tH < tA && gH < gA);
    if (dogruKazanan && (tH === gH || tA === gA)) return 3; // Kazananı bilip, bir golü tutturmak
    if (dogruKazanan) return 2;                      // Sadece kazananı bilmek
    if (tH === gH || tA === gA) return 1;             // Kazananı bilemeyip bir golü tutturmak
    return 0;
}

app.post('/api/kayit', async (req, res) => { try { await new User(req.body).save(); res.json({ mesaj: "Kayıt başarılı!" }); } catch { res.json({ mesaj: "Hata!" }); } });
app.post('/api/giris', async (req, res) => { const user = await User.findOne(req.body); res.json(user ? { basarili: true, isim: user.isim } : { basarili: false }); });
app.post('/api/tahmin-kaydet', async (req, res) => { await User.findOneAndUpdate({ isim: req.body.isim }, { tahminler: req.body.tahminler }); res.json({ mesaj: "Kaydedildi!" }); });
app.get('/api/maclar/:tarih', async (req, res) => { res.json(await Mac.find({ tarih: req.params.tarih })); });
app.get('/api/puan-tablosu', async (req, res) => { res.json(await User.find().sort({ puan: -1 })); });

app.post('/api/admin/mac-ekle', async (req, res) => {
    if (req.body.sifre !== "ordu52") return res.status(403).send("Hata");
    await Mac.findOneAndUpdate({ macId: req.body.mac.macId }, req.body.mac, { upsert: true });
    res.json({ mesaj: "Eklendi" });
});

app.post('/api/admin/skor-gir', async (req, res) => {
    if (req.body.sifre !== "ordu52") return res.status(403).send("Hata");
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