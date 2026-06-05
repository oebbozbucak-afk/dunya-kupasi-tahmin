const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Parola123@cluster0.nbchjpc.mongodb.net/dunya_kupasi?retryWrites=true&w=majority';
mongoose.connect(uri);

const Tahmin = mongoose.model('Tahmin', new mongoose.Schema({ isim: { type: String, unique: true }, tahminler: Object, puan: { type: Number, default: 0 } }));
const Mac = mongoose.model('Mac', new mongoose.Schema({ 
    tarih: String, 
    isim: String, 
    macId: { type: String, unique: true },
    homeScore: { type: Number, default: 0 }, 
    awayScore: { type: Number, default: 0 } 
}));

function hesapla(tH, tA, gH, gA) {
    if (tH === gH && tA === gA) return 6;
    let p = 0;
    if ((tH > tA && gH > gA) || (tH < tA && gH < gA)) p += 2;
    else if (tH === tA && gH === gA) p += 3;
    if (tH === gH) p += 1; if (tA === gA) p += 1;
    return p;
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
    await Mac.create(req.body.mac);
    res.json({ mesaj: "Maç eklendi!" });
});

app.get('/api/puan-tablosu', async (req, res) => {
    const list = await Tahmin.find().sort({ puan: -1 });
    res.json(list);
});

app.listen(process.env.PORT || 3000);