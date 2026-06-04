const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 1. BULUT VERİTABANI BAĞLANTISI
// Senin MongoDB Atlas'tan aldığın ve şifreni yazdığın orijinal linki buraya koyduk
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Samanta52@cluster0.nbchjpc.mongodb.net/dunya_kupasi?appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("🟢 MongoDB baglantisi basarili!"))
    .catch(err => console.error("🔴 Veritabanı hatasi:", err));

// 2. VERİ MODELLERİ
const TahminSchema = new mongoose.Schema({
    isim: { type: String, required: true },
    tahminler: { type: Object, required: true },
    puan: { type: Number, default: 0 }, 
    tarih: { type: Date, default: Date.now }
});
const Tahmin = mongoose.model('Tahmin', TahminSchema);

const SonucSchema = new mongoose.Schema({
    macId: { type: String, required: true, unique: true },
    homeScore: { type: Number, required: true },
    awayScore: { type: Number, required: true }
});
const Sonuc = mongoose.model('Sonuc', SonucSchema);

// 3. FİKSTÜRÜMÜZ
const fikstur = [
    { id: "mac1", home: "Kanada 🇨🇦", away: "🇺🇸 ABD" },
    { id: "mac2", home: "Meksika 🇲🇽", away: "💪 Play-off A" },
    { id: "mac3", home: "Arjantin 🇦🇷", away: "🇫🇷 Fransa" },
    { id: "mac4", home: "Brezilya 🇧🇷", away: "🇩🇪 Almanya" }
];

app.get('/api/fikstur', (req, res) => {
    res.json(fikstur);
});

// 4. PUAN HESAPLAMA MOTORU (Senin attığın kurallara göre çalışan sistem)
function puanHesapla(tahminHome, tahminAway, gercekHome, gercekAway) {
    let puan = 0;

    const tahminTrend = tahminHome - tahminAway; 
    const gercekTrend = gercekHome - gercekAway;

    if (tahminTrend > 0 && gercekTrend > 0) {
        puan += 2; 
    } else if (tahminTrend < 0 && gercekTrend < 0) {
        puan += 2;
    } else if (tahminTrend === 0 && gercekTrend === 0) {
        puan += 3;
    }

    if (tahminHome === gercekHome && tahminAway === gercekAway) {
        puan += 4;
    }

    if (!(tahminHome === gercekHome && tahminAway === gercekAway)) {
        if (tahminHome === gercekHome || tahminAway === gercekAway) {
            puan += 1;
        }
    }

    return puan;
}

// 5. TAHMİNLERİ VERİTABANINA YAZMA KAPISI
app.post('/api/tahmin-kaydet', async (req, res) => {
    try {
        const { isim, tahminler } = req.body;
        if (!isim || !tahminler) return res.status(400).json({ mesaj: "Eksik bilgi!" });

        await Tahmin.findOneAndUpdate(
            { isim: isim },
            { tahminler: tahminler, tarih: new Date() },
            { upsert: true, new: true }
        );
        res.json({ mesaj: "Tahminleriniz başarıyla bulut veritabanına kaydedildi!" });
    } catch (error) {
        res.status(500).json({ mesaj: "Hata olustu!" });
    }
});

// 6. PUAN TABLOSUNU GETİREN KAPI
app.get('/api/puan-tablosu', async (req, res) => {
    try {
        const liderlik = await Tahmin.find().sort({ puan: -1 }).select('isim puan');
        res.json(liderlik);
    } catch (error) {
        res.status(500).json({ mesaj: "Puan tablosu alınamadı." });
    }
});

// 7. ADMİN SKOR GİRİŞ KAPISI (Şifre: ordu52)
app.post('/api/admin/mac-sonucu-gir', async (req, res) => {
    try {
        const { sifre, macId, homeScore, awayScore } = req.body;
        
        if (sifre !== "ordu52") { 
            return res.status(403).json({ mesaj: "Yetkisiz Giriş!" });
        }

        await Sonuc.findOneAndUpdate(
            { macId: macId },
            { homeScore: Number(homeScore), awayScore: Number(awayScore) },
            { upsert: true }
        );

        const tumKullanicilar = await Tahmin.find();
        const tumSonuclar = await Sonuc.find();

        for (let kullanici of tumKullanicilar) {
            let toplamPuan = 0;
            
            for (let sonuc of tumSonuclar) {
                const usertahmin = kullanici.tahminler[sonuc.macId];
                if (usertahmin && usertahmin.home !== undefined && usertahmin.away !== undefined) {
                    toplamPuan += puanHesapla(
                        Number(usertahmin.home), 
                        Number(usertahmin.away), 
                        sonuc.homeScore, 
                        sonuc.awayScore
                    );
                }
            }
            kullanici.puan = toplamPuan;
            await kullanici.save();
        }

        res.json({ mesaj: "Maç sonucu kaydedildi ve puanlar güncellendi!" });
    } catch (error) {
        res.status(500).json({ mesaj: "Hata oluştu." });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda canavar gibi çalışıyor!`);
});