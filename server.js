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
    res.json({ mesaj: "Maç kaydedildi!" });
});

app.get('/api/puan-tablosu', async (req, res) => {
    const list = await Tahmin.find().sort({ puan: -1 });
    res.json(list);
});

app.listen(process.env.PORT || 3000);