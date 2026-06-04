const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 1. BULUT VERİTABANI BAĞLANTISI
// Alttaki tırnak işaretlerinin içine MongoDB'den aldığın şifreli uzun linki yapıştır:
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://bahadir:Samanta52@cluster0.nbchjpc.mongodb.net/?appName=Cluster0';

mongoose.connect(mongoURI)
    .then(() => console.log("🟢 MongoDB Veritabanına Başarıyla Bağlandık!"))
    .catch(err => console.error("🔴 Veritabanı bağlantı hatası:", err));

// 2. VERİ MODELİ (Tahmin Şeması)
const TahminSchema = new mongoose.Schema({
    isim: { type: String, required: true },
    tahminler: { type: Object, required: true }, // Örn: { mac1: { home: 2, away: 1 } }
    tarih: { type: Date, default: Date.now }
});
const Tahmin = mongoose.model('Tahmin', TahminSchema);

// 3. GERÇEK FİKSTÜRÜMÜZ
const fikstur = [
    { id: "mac1", home: "Kanada 🇨🇦", away: "🇺🇸 ABD" },
    { id: "mac2", home: "Meksika 🇲🇽", away: "💪 Play-off A" },
    { id: "mac3", home: "Arjantin 🇦🇷", away: "🇫🇷 Fransa" },
    { id: "mac4", home: "Brezilya 🇧🇷", away: "🇩🇪 Almanya" }
];

// Fikstürü frontend'e gönderen kapı
app.get('/api/fikstur', (req, res) => {
    res.json(fikstur);
});

// 4. TAHMİNLERİ VERİTABANINA KAYDETME KAPISI
app.post('/api/tahmin-kaydet', async (req, res) => {
    try {
        const { isim, tahminler } = req.body;

        if (!isim || !tahminler) {
            return res.status(400).json({ mesaj: "Lütfen adınızı ve tahminlerinizi eksiksiz doldurun!" });
        }

        // Aynı isimde eski bir tahmin varsa üzerine yazar, yoksa yeni oluşturur
        await Tahmin.findOneAndUpdate(
            { isim: isim },
            { tahminler: tahminler, tarih: new Date() },
            { upsert: true, new: true }
        );

        console.log(`💾 ${isim} isimli oyuncunun tahminleri MongoDB'ye kaydedildi.`);
        res.json({ mesaj: "Tahminleriniz başarıyla bulut veritabanına kaydedildi!" });

    } catch (error) {
        console.error("Kayıt hatası:", error);
        res.status(500).json({ mesaj: "Veritabanına kaydedilirken bir hata oluştu!" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Sunucu ${PORT} portunda canavar gibi çalışıyor!`);
});