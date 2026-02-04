# ani-defteri-order-automation — PRD (v0.1)

**Tarih:** 2026-02-02  
**Durum:** Taslak / IDE agent ile geliştirmeye uygun

## 1) Özet

Bu proje; WhatsApp üzerinden gelen siparişleri, müşteriye gönderilen bir form linki ile toplamak; fotoğraf + metin + seçenekleri **Google Drive** üzerinde standart bir klasör yapısına kaydetmek; ardından **Adobe Photoshop** (ExtendScript/JSX) ile şablonlara otomatik yerleştirip tasarım sürecini hızlandırmak için geliştirilir.

Mevcut repo; (1) statik bir sipariş formu, (2) Node/Express API ile Drive’a upload ve klasörleme, (3) Photoshop tarafında “hazırlama” ve “baskı/kesim” scriptleri + (4) görselleri PDF’e çeviren Python scripti içerir.

## 2) Hedefler

### Ürün hedefleri
- Sipariş alımını “WhatsApp chat”ten çıkartıp **form tabanlı, hatasız** hale getirmek.
- Drive üzerinde **tek tip klasör + dosya isimleri** ile tasarımcıya düzenli veri akışı sağlamak.
- Photoshop scriptleri ile **otomatik yerleştirme** sayesinde tasarım süresini ciddi azaltmak.
- Müşteri onayına gidecek **hafif PDF** çıktıları üretmek.
- Onay sonrası baskı/kesim için **standart output** (PNG/JPG/PDF) üretmek.

### Başarı metrikleri (ölçülebilir)
- Ortalama sipariş hazırlama süresi (foto+metin toplama) ↓
- Photoshop otomatik doldurma sonrası “manuel düzeltme” sayısı ↓
- Eksik/yanlış dosya teslimi (yanlış sayfa foto, eksik metin) ↓
- Müşteriye önizleme gönderim süresi ↓

## 3) Kapsam

### MVP (Bu PRD’nin odaklandığı)
1. **Sipariş Formu (Müşteri)**
   - Ad soyad (klasör adı), gerekli metin alanları, foto yükleme alanları, genel foto bulk upload.
   - Gönderim sonrası “sipariş kodu” ve gönderime dair net durum ekranı.

2. **Drive’a Kaydetme**
   - Standart kök klasör altında sipariş klasörü.
   - Alt klasörler: `genel/`, `ozel/`
   - `bilgiler.txt` + opsiyonel `order.json` (manifest).

3. **Photoshop Hazırlama Script Entegrasyonu**
   - Yerel sync klasöründe (Drive Desktop) sipariş klasörlerini tarar.
   - `bilgiler.txt` ile text layer doldurur.
   - Foto eşlemesi: özel foto -> doğru slot, genel foto -> sırayla/döngü ile.

4. **Önizleme Çıktısı**
   - Photoshop export (düşük çözünürlük JPG) + Python ile PDF üretimi (küçük boyut).

5. **Baskı/Kesim Çıktısı**
   - Onay sonrası baskı scripti ile 4’lü kesim şablonlarına yerleştirme + çıktı klasörleme.

### MVP dışı (Sonraya)
- WhatsApp Business API ile otomatik mesajlaşma
- Tam otomatik trigger (yeni sipariş gelince otomatik Photoshop çalıştırma)
- Çoklu ürün / varyant / ödeme / Shopify entegrasyonu
- Kullanıcı login / çoklu tasarımcı rolleri

## 4) Kullanıcılar ve Akışlar

### 4.1 Müşteri akışı
1. WhatsApp’ta sipariş başlatır → Link alır
2. Formu doldurur → Foto yükler → Gönder
3. “Sipariş alındı” ekranı + sipariş kodu

### 4.2 Tasarımcı / Operasyon akışı
1. Drive Desktop senkron klasöründe yeni sipariş klasörü görünür
2. “Hazırlama” scripti çalıştırılır → PSD otomatik dolar
3. Tasarımcı kontrol + revize
4. “Önizleme” çıktısı alınır → WhatsApp ile PDF’ler gönderilir
5. Onay → “Baskı/kesim” çıktısı üretilir

## 5) Veri modeli ve klasör standardı

### 5.1 Sipariş ID
- `orderId`: zaman + rastgele (ör: `20260202-1153_AB12CD`)
- Drive klasör adı: `<ORDER_ID>__<customerSlug>` (örn: `20260202-1153_AB12CD__berat-olmez`)

> Not: “musteri_adi” aynı isimle tekrar sipariş verdiğinde çakışmayı engeller.

### 5.2 Drive klasör yapısı (önerilen v2)
```
Ani-Defteri-Siparisler/
  2026/
    02/
      <ORDER_ID>__<customerSlug>/
        bilgiler.txt
        order.json
        genel/
          Foto_...jpg
          Foto_...jpg
        ozel/
          01_Sayfa.jpg
          03_Sayfa_1.jpg
          03_Sayfa_2.jpg
          ...
        outputs/
          psd/
          preview_pdf/
          print_ready/
        logs/
          server.log
          photoshop.log
```

### 5.3 Manifest dosyası (order.json) — önerilen
```json
{
  "schemaVersion": "1.0",
  "orderId": "20260202-1153_AB12CD",
  "customerName": "Berat Ölmez",
  "createdAt": "<ISO_DATETIME>",
  "fields": {
    "Text_Ana_Baslik": "Our\nMemories",
    "Text_Film_Baslik": "...",
    "...": "..."
  },
  "files": {
    "special": {
      "01_Sayfa": "01_Sayfa.jpg",
      "03_Sayfa_1": "03_Sayfa_1.jpg"
    },
    "general": ["Foto_...jpg", "Foto_...jpg"]
  },
  "status": "submitted"
}
```

## 6) Fonksiyonel Gereksinimler

### 6.1 Form
- Zorunlu alanlar: `musteri_adi` + kritik metin alanları + minimum foto kuralları (ör: kapak foto şart).
- Dosya tipi: sadece image (jpg/png) + limit (örn 20MB / dosya).
- “12_Genel_Photos” için çoklu upload açık.
- Kullanıcıya yükleme ilerlemesi + hata mesajları.
- Başarılı gönderimde sipariş kodunu ve “WhatsApp’ta kopyala” metnini göster.

### 6.2 API / Backend
- Endpoint: `POST /api/olustur`
- Validasyon:
  - `musteri_adi` slug + güvenli karakter seti
  - dosya sayısı ve boyutu
- Drive:
  - Root klasör id’si config’te saklanır (listeleme yerine).
  - Sipariş klasörü benzersiz id ile açılır.
  - `bilgiler.txt` + `order.json` upload edilir.
  - Dosyalar alt klasörlere uygun isimle kaydedilir.
- Log:
  - Her sipariş için server-side log satırları `logs/server.log` içine append (opsiyonel).

### 6.3 Photoshop Hazırlama
- Kural: “özel foto” slot eşlemesi **layer adı** ile birebir (örn layer `_IMG_03_Sayfa_2` → dosya `03_Sayfa_2.jpg`)
- “genel foto” slotları sırayla/round-robin doldurur (varsa shuffle).
- `bilgiler.txt` anahtarı ile text layer adı birebir eşleşir.
- Çıktı: `outputs/psd/<ORDER_ID>_Final.psd` + `Kullanilan_Fotograflar/`

### 6.4 Önizleme (PDF)
- PSD’den export:
  - düşük çözünürlük JPG (örn 1500px genişlik) veya 72-100 DPI
  - `outputs/preview_jpg/`
- Python ile PDF:
  - her klasör için tek PDF veya tek bir multi-page PDF
  - `outputs/preview_pdf/preview_<ORDER_ID>.pdf`
- Hedef: WhatsApp’tan rahat gidecek boyut (örn < 10–15MB)

### 6.5 Baskı/Kesim
- Onay sonrası export:
  - baskı için gerekli PNG/JPG seti `outputs/print_ready/input/`
- `ani_defteri_baski_sc.jsx`:
  - müşteri klasörlerini gezip 4’lü şablonlara basar
  - çıktı klasörü standardı: `outputs/print_ready/imposition/`
  - isimlendirme: tarih + batch + sıra

## 7) Güvenlik ve KVKK

- Repo’da **.env** ve **tokens.json** tutulmaz (gitignore).
- Google OAuth client secret/tokens rotate edilir.
- Form linki “herkese açık” ise:
  - minimum: rate limit + basic anti-bot (örn basit token)
  - ideal: WhatsApp’tan gönderilen **tek kullanımlık form tokenı** (`/o/<token>`)
- Drive’da tutulan veriler için:
  - saklama süresi (örn 90 gün) ve silme prosedürü belirlenir (opsiyonel)

## 8) Teknik Tasarım Notları

- Express 5 + multer ile upload
- Drive API scope:
  - `drive.file` minimal ama “listeleme kısıtları” olabilir → rootFolderId saklama yaklaşımı önerilir.
- Konfigürasyon:
  - `config.json` (local) + `ENV` (prod)
- Script path’leri hardcode edilmez; config’ten okunur.

## 9) Kabul Kriterleri

- Formdan gönderilen sipariş Drive’da standart yapıda oluşuyor.
- Aynı isimle iki sipariş çakışmıyor (orderId).
- Photoshop hazırlama scripti:
  - özel slotları doğru foto ile dolduruyor (03_Sayfa_1, 03_Sayfa_2 farklı dosyalar).
  - genel foto slotları boş kalmıyor (yeterli foto varsa).
- Önizleme PDF’ler doğru klasöre üretiliyor ve boyutu hedef aralıkta.
- Baskı/kesim çıktısı belirlenen output standardıyla üretiliyor.

## 10) Açık Sorular / Riskler

- Drive Desktop senkron gecikmesi: “sipariş geldi” ile “PC’de klasör göründü” arasında süre.
- Photoshop background removal başarımı: farklı foto türlerinde hata olasılığı.
- WhatsApp API entegrasyonu (istersen sonraki faz).
