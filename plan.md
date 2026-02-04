# ani-defteri-order-automation — Geliştirme Planı (v0.1)

Bu plan; IDE içindeki agent ile “vibe coding” şeklinde adım adım geliştirme yapabilmen için **epic / task / checklist** formatında yazıldı.

## Epic 0 — Repo temizlik + güvenlik (hemen)

### Task 0.1 — Hassas dosyaları repodan çıkar
Checklist:
- [ ] `.env`, `tokens.json`, `temp_uploads/` repoda kalmayacak
- [ ] `.gitignore` ekle: `node_modules/`, `.env*`, `tokens.json`, `temp_uploads/`, `*.log`
- [ ] `.env.example` oluştur (gerçek secret olmadan)

### Task 0.2 — Google OAuth güvenliği
Checklist:
- [ ] Google OAuth client secret ve token’ları **rotate** et
- [ ] Prod’da token saklama: `GOOGLE_TOKENS` env üzerinden (mevcut yaklaşımın devamı)
- [ ] Local dev’de: `tokens.json` sadece lokal makinede (gitignore)

### Task 0.3 — Konfigürasyon standardı
Checklist:
- [ ] `config.json` (local) + `ENV` (prod) hiyerarşisi
- [ ] Drive root folder id’si için: `DRIVE_ROOT_FOLDER_ID` env/config

Agent prompt (IDE):
- “Repo’da commitlenmiş hassas dosyaları tespit et, .gitignore ve .env.example ekle, server.js içinde config okuma katmanı oluştur.”

---

## Epic 1 — Sipariş ID + klasör yapısı v2

Hedef: “musteri_adi” ile çakışma ve karışıklığı bitirmek; her siparişi benzersiz id ile yönetmek.

### Task 1.1 — orderId üretimi
Checklist:
- [ ] `orderId = YYYYMMDD-HHmm_<RANDOM6>` üret
- [ ] `customerSlug` üret (Türkçe karakterleri normalize et, boşluğu `-` yap)
- [ ] Drive klasör adı: `<ORDER_ID>__<customerSlug>`

### Task 1.2 — Drive klasör hiyerarşisi (yıl/ay)
Checklist:
- [ ] `Ani-Defteri-Siparisler/2026/02/<orderFolder>/...` mantığı
- [ ] Alt klasörler: `genel/`, `ozel/`, `outputs/`, `logs/`

### Task 1.3 — order.json (manifest) yaz
Checklist:
- [ ] `order.json` oluştur ve upload et
- [ ] `bilgiler.txt` geriye uyumluluk için devam et
- [ ] Status: `submitted`

Agent prompt (IDE):
- “/api/olustur akışını orderId bazlı hale getir, klasör yapısını v2’ye geçir, order.json + bilgiler.txt üret.”

---

## Epic 2 — Upload sağlamlaştırma (validasyon, limit, hata)

### Task 2.1 — Multer limit + fileFilter
Checklist:
- [ ] Sadece image mime-types
- [ ] Dosya boyutu limiti (örn 20MB)
- [ ] Maks dosya sayısı (örn 50)

### Task 2.2 — Form validasyon UX
Checklist:
- [ ] Zorunlu alanlar (kapak foto, kritik metinler)
- [ ] Upload progress + hata mesajı
- [ ] Başarılı durumda sipariş kodu göster + “kopyala” butonu

### Task 2.3 — Anti-spam
Checklist:
- [ ] Basit rate limit (IP bazlı)
- [ ] Opsiyonel: form tokenı (Epic 3’te)

Agent prompt (IDE):
- “Multer’ı güvenli hale getir (limit+filter), front-end’de required alanları ve progress UI ekle.”

---

## Epic 3 — Link/token mimarisi (WhatsApp üzerinden güvenli paylaşım)

### Task 3.1 — Tek kullanımlık form linki
Checklist:
- [ ] `/o/<token>` route (public form)
- [ ] Token DB’siz basit yaklaşım: Drive’da `tokens/` klasöründe json kayıt (veya local JSON)
- [ ] Token kullanıldıktan sonra `used=true`

### Task 3.2 — WhatsApp mesaj şablonu üret
Checklist:
- [ ] Admin ekranında “müşteriye gönder” metni hazırla
- [ ] Link + kısa yönergeler + KVKK notu

Agent prompt (IDE):
- “Token tabanlı order form linki üret (DB’siz), token doğrulama ve tek kullanım mantığını ekle.”

---

## Epic 4 — Admin panel (sipariş takibi)

### Task 4.1 — Basit auth
Checklist:
- [ ] `/admin` basic auth (env’den kullanıcı/şifre)
- [ ] UI: sipariş listesi

### Task 4.2 — Drive’dan sipariş listeleme
Checklist:
- [ ] Root folder children list (Drive API)
- [ ] Her sipariş için: orderId, müşteri adı, createdAt, status, dosya sayıları
- [ ] “Klasörü aç” (Drive link) veya “yerel yol” göster (manuel)

### Task 4.3 — Status güncelleme
Checklist:
- [ ] Status’ı `order.json` içinde güncelle (submitted → psd_done → preview_sent → approved → print_done)
- [ ] `logs/` içine küçük bir audit trail

Agent prompt (IDE):
- “Admin panel ekle: Drive’dan siparişleri listele, order.json status güncelle, basit auth uygula.”

---

## Epic 5 — Photoshop script uyumu (kritik düzeltme)

Bu epikte hedef: özel foto eşlemesinin doğru olması ve tekrar eden foto bug’ının bitmesi.

### Task 5.1 — Özel foto eşlemesini slot bazlı yap
Checklist:
- [ ] `ozel/` içindeki dosyaları map’e çevir: baseName → file
- [ ] `_IMG_` layer için: önce **layer.name** ile birebir eşleştir
- [ ] Eşleşme yoksa: sayfa bazlı fallback (istenirse)

### Task 5.2 — Çoklu slotlarda çakışmayı engelle
Checklist:
- [ ] 03_Sayfa_1 ve 03_Sayfa_2 ayrı dosyaları alsın
- [ ] Eğer eksikse log yazıp genel foto ile doldurma opsiyonu

### Task 5.3 — Çıktı klasörü standardı
Checklist:
- [ ] `outputs/psd/` içine Final.psd
- [ ] `Kullanilan_Fotograflar/` isimlendirmeleri net

Agent prompt (IDE):
- “ani_defteri_hazirlama_sc.jsx içinde özel foto seçim mantığını layer adı bazlı yap; çoklu slot bug’ını düzelt; output klasörlerine yaz.”

---

## Epic 6 — Önizleme PDF üretimi (küçük boyut)

### Task 6.1 — Photoshop export scripti (öneri)
Checklist:
- [ ] Aktif PSD’den sayfaları düşük kalite JPG export
- [ ] `outputs/preview_jpg/` içine koy

### Task 6.2 — Python PDF pipeline’ı
Checklist:
- [ ] `pdf_yap.py` hardcode path yerine argüman alsın
- [ ] İstenirse tek PDF (multi-page) üret: `preview_<ORDER_ID>.pdf`
- [ ] Boyut kontrolü (gerekirse JPG downscale)

Agent prompt (IDE):
- “pdf_yap.py’yi CLI argümanlı yap, preview_jpg klasörünü pdf’e çeviren pipeline oluştur.”

---

## Epic 7 — Baskı/kesim pipeline standardı

### Task 7.1 — Baskı script config
Checklist:
- [ ] Hardcode path’leri config’ten al
- [ ] Output’u `outputs/print_ready/` içine yaz

### Task 7.2 — Operasyon akışı dokümantasyonu
Checklist:
- [ ] “Onay geldi → PNG export → baskı script → çıktı kontrol” adımlarını README’ye yaz

Agent prompt (IDE):
- “ani_defteri_baski_sc.jsx path’lerini config’e bağla, output standardını PRD’ye göre güncelle.”

---

## En iyi ilerleme sırası (öneri)

1) Epic 0 → 1 → 5 (hemen değer)  
2) Epic 2 → 4 (stabil sistem)  
3) Epic 6 → 7 (uçtan uca pipeline)  
4) Epic 3 (token/link) (operasyonel ihtiyaçlara göre)

