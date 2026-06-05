const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const uri = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Parola123@cluster0.nbchjpc.mongodb.net/dunya_kupasi?retryWrites=true&w=majority';
mongoose.connect(uri);

const User = mongoose.model('User', new mongoose.Schema({ isim: { type: String, unique: true }, puan: { type: Number, default: 0 }, tahminler: Object }));
const Mac = mongoose.model('Mac', new mongoose.Schema({ tarih: String, isim: String, macId: { type: String, unique: true }, homeScore: { type: Number, default: 0 }, awayScore: { type: Number, default: 0 } }));

function hesapla(tH, tA, gH, gA) {
    tH = Number(tH); tA = Number(tA); gH = Number(gH); gA = Number(gA);
    
    let tahminBerabere = (tH === tA);
    let gercekBerabere = (gH === gA);
    let dogruKazanan = (tH > tA && gH > gA) || (tH < tA && gH < gA);
    let homeGolDogru = (tH === gH);
    let awayGolDogru = (tA === gA);

    // 1. Beraberlikte Tam Skor (7 Puan)
    if (tahminBerabere && gercekBerabere && tH === gH) return 7;

    // 2. Galibiyette Tam Skor (6 Puan)
    if (dogruKazanan && tH === gH && tA === gA) return 6;

    // 3. Beraberliği bilmek (Berabere biteceğini bildi ama skor farklı) - 3 Puan
    if (tahminBerabere && gercekBerabere) return 3;

    // 4. Kazananı doğru bilip bir takımın golünü bilmek - 3 Puan
    if (dogruKazanan && (homeGolDogru || awayGolDogru)) return 3;

    // 5. Sadece kazananı bilmek - 2 Puan
    if (dogruKazanan) return 2;

    // 6. Kazananı bilemeyip bir takımın golünü bilmek - 1 Puan
    if (homeGolDogru || awayGolDogru) return 1;

    return 0;
}

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

app.get('/api/maclar/:tarih', async (req, res) => { res.json(await Mac.find({ tarih: req.params.tarih })); });
app.get('/api/puan-tablosu', async (req, res) => { res.json(await User.find().sort({ puan: -1 })); });

app.get('/api/tum-tahminler', async (req, res) => {
    const users = await User.find({}, 'isim tahminler');
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

app.post('/api/admin/puan-duzenle', async (req, res) => {
    if (req.body.sifre !== "ordu52") return;
    await User.findOneAndUpdate({ isim: req.body.isim }, { puan: req.body.yeniPuan });
    res.json({ mesaj: "Puan güncellendi!" });
});

app.listen(process.env.PORT || 3000);