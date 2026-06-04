const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Parola123@cluster0.nbchjpc.mongodb.net/dunya_kupasi?retryWrites=true&w=majority';
mongoose.connect(uri)
    .then(() => console.log("Veritabanı bağlantısı başarılı!"))
    .catch(err => console.log("Veritabanı hatası:", err));

const Tahmin = mongoose.model('Tahmin', new mongoose.Schema({ isim: { type: String, unique: true }, tahminler: Object, puan: { type: Number, default: 0 } }));
const Sonuc = mongoose.model('Sonuc', new mongoose.Schema({ macId: { type: String, unique: true }, homeScore: Number, awayScore: Number }));

// GÜNCEL PUANLAMA MOTORU
function hesapla(tH, tA, gH, gA) {
    // Tam Skor: Kazanan(2) + Skor(4) = 6 puan
    if (tH === gH && tA === gA) return 6;
    
    let p = 0;
    // Kazananı veya Beraberliği Bilme
    if ((tH > tA && gH > gA) || (tH < tA && gH < gA)) p += 2;
    else if (tH === tA && gH === gA) p += 3;
    
    // Gol bilme
    if (tH === gH) p += 1; 
    if (tA === gA) p += 1;
    
    return p;
}

app.post('/api/tahmin-kaydet', async (req, res) => {
    const { isim, tahminler } = req.body;
    if (!isim) return res.status(400).json({ mesaj: "İsim gerekli!" });
    await Tahmin.findOneAndUpdate({ isim: isim }, { tahminler: tahminler }, { upsert: true });
    res.json({ mesaj: "Tahmin kaydedildi!" });
});

app.get('/api/puan-tablosu', async (req, res) => {
    const list = await Tahmin.find().sort({ puan: -1 });
    res.json(list);
});

app.post('/api/admin/mac-sonucu-gir', async (req, res) => {
    if (req.body.sifre !== "ordu52") return res.status(403).json({ mesaj: "Hatalı şifre!" });
    await Sonuc.findOneAndUpdate({ macId: req.body.macId }, { homeScore: req.body.homeScore, awayScore: req.body.awayScore }, { upsert: true });
    
    const tumTahminler = await Tahmin.find();
    const sonuclar = await Sonuc.find();
    for (let t of tumTahminler) {
        let yeniPuan = 0;
        sonuclar.forEach(s => {
            if (t.tahminler[s.macId]) {
                yeniPuan += hesapla(Number(t.tahminler[s.macId].home), Number(t.tahminler[s.macId].away), s.homeScore, s.awayScore);
            }
        });
        t.puan = yeniPuan;
        await t.save();
    }
    res.json({ mesaj: "Puanlar güncellendi!" });
});

app.post('/api/admin/puan-duzelt', async (req, res) => {
    if (req.body.sifre !== "ordu52") return res.status(403).json({ mesaj: "Hatalı şifre!" });
    await Tahmin.findOneAndUpdate({ isim: req.body.isim }, { puan: req.body.yeniPuan });
    res.json({ mesaj: "Puan başarıyla güncellendi!" });
});

app.listen(process.env.PORT || 3000);