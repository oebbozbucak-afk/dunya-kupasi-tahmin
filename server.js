const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Parola123@cluster0.nbchjpc.mongodb.net/dunya_kupasi?retryWrites=true&w=majority';
mongoose.connect(uri);

const User = mongoose.model('User', new mongoose.Schema({ 
    isim: { type: String, unique: true }, 
    puan: { type: Number, default: 0 }, 
    tahminler: Object,
    turnuvaTahminleri: Object 
}));
const Mac = mongoose.model('Mac', new mongoose.Schema({ tarih: String, isim: String, macId: { type: String, unique: true }, homeScore: { type: Number, default: 0 }, awayScore: { type: Number, default: 0 } }));

app.post('/api/giris', async (req, res) => {
    let user = await User.findOne({ isim: req.body.isim });
    if (!user) user = await new User({ isim: req.body.isim }).save();
    res.json({ isim: user.isim });
});

app.post('/api/tahmin-kaydet', async (req, res) => {
    let user = await User.findOne({ isim: req.body.isim });
    let mevcutTahminler = user.tahminler || {};
    Object.assign(mevcutTahminler, req.body.yeniTahminler);
    await User.findOneAndUpdate({ isim: req.body.isim }, { tahminler: mevcutTahminler });
    res.json({ mesaj: "Tahminler kaydedildi!" });
});

app.post('/api/turnuva-tahmin', async (req, res) => {
    await User.findOneAndUpdate({ isim: req.body.isim }, { turnuvaTahminleri: req.body.tahminler });
    res.json({ mesaj: "Turnuva tahminleri kaydedildi!" });
});

app.get('/api/maclar/:tarih', async (req, res) => { res.json(await Mac.find({ tarih: req.params.tarih })); });
app.get('/api/puan-tablosu', async (req, res) => { res.json(await User.find().sort({ puan: -1 })); });
app.get('/api/tum-tahminler', async (req, res) => {
    const users = await User.find({}, 'isim tahminler turnuvaTahminleri');
    const maclar = await Mac.find({}, 'macId isim');
    const macHaritasi = {};
    maclar.forEach(m => macHaritasi[m.macId] = m.isim);
    res.json({ users, macHaritasi });
});

app.post('/api/admin/mac-ekle', async (req, res) => {
    if (req.body.sifre !== "ordu52") return;
    await Mac.findOneAndUpdate({ macId: req.body.mac.macId }, req.body.mac, { upsert: true });
    res.json({});
});

app.post('/api/admin/skor-gir', async (req, res) => {
    if (req.body.sifre !== "ordu52") return;
    await Mac.findOneAndUpdate({ macId: req.body.macId }, { homeScore: req.body.homeScore, awayScore: req.body.awayScore });
    res.json({ mesaj: "Skor güncellendi" });
});

app.post('/api/admin/tahmin-sil', async (req, res) => {
    if (req.body.sifre !== "ordu52") return;
    await User.findOneAndUpdate({ isim: req.body.isim }, { tahminler: {} });
    res.json({ mesaj: "Tahminler silindi!" });
});

app.listen(process.env.PORT || 3000);