# AlphaDesk Terminal 📈

> **Borsa İstanbul (BIST 100) & Global Piyasalar için Kurumsal Düzeyde Kantitatif Analiz, Değerleme ve Portföy Risk Terminali**

[![Deploy to GitHub Pages](https://github.com/Atakan1910/alphadesk-terminal/actions/workflows/deploy.yml/badge.svg)](https://github.com/Atakan1910/alphadesk-terminal/actions/workflows/deploy.yml)
[![Update Market Data](https://github.com/Atakan1910/alphadesk-terminal/actions/workflows/update-market-data.yml/badge.svg)](https://github.com/Atakan1910/alphadesk-terminal/actions/workflows/update-market-data.yml)
[![Live Demo](https://img.shields.io/badge/Canl%C4%B1%20Terminal-atakan1910.github.io-10b981?style=flat&logo=googlechrome&logoColor=white)](https://atakan1910.github.io/alphadesk-terminal/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-Proxy-f38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

---

### 🌐 Canlı Önizleme
Uygulamayı tarayıcınızdan veya telefonunuzdan anında test etmek için:
👉 **[https://atakan1910.github.io/alphadesk-terminal/](https://atakan1910.github.io/alphadesk-terminal/)**

---

## 🌟 Temel Özellikler

### 1. Midas Tarzı Çizgisel & TradingView Mum Grafikleri (`ProChart.tsx`)
* **Sade & Modern Tasarım:** Vadeye göre dinamik yeşil (`#10b981`) veya kırmızı (`#f43f5e`) çizgisel grafik; vade başlangıç referans çizgisi ve dönemsel net değişim yüzdesi.
* **İsteğe Bağlı Mum Grafiği:** Sağ üstten tek tıkla tam teşekküllü mum görünümüne geçiş (`lightweight-charts` v5).
* **Overlay Katmanları:** `EMA 9/21/50/200`, `SMA 20`, `Bollinger Bantları`, `VWAP`, `Destek/Direnç Seviyeleri` ve `Fibonacci Düzeltmeleri`.
* **Senkronize Alt Paneller:** `Hacim`, `RSI 14`, `MACD`, `ATR 14`, `Stochastic Oscillator`.

### 2. Sınırsız Borsa Evreni & Cloudflare Worker Canlı Proxy
* **120+ Gerçek Hisse Hazır:** 95 BIST hissesi (BIST 100 ana evreni) + 25 Global dev hisse önbelleğe alınmış olarak saniyeler içinde açılır.
* **Tüm Dünya Borsalarında Canlı Arama:** Arama kutusuna listede olmayan herhangi bir BIST (örn: `TUKAS`, `MIATK`, `EUPWR`) veya global hisse (örn: `SONY`, `BABA`, `SAP`) yazıldığında Cloudflare Edge Proxy üzerinden 365 günlük gerçek fiyat geçmişi canlı indirilir ve anında analiz edilir.

### 3. Şirket Röntgeni & Canlı DCF İndirgenmiş Nakit Akımı
* **Piotroski F-Score (0–9):** 9 bağımsız finansal kriter üzerinden kârlılık, kaldıraç/likidite ve faaliyet etkinliği denetimi.
* **Altman Z-Score:** Finansal sağlamlık ve iflas riski (Güvenli, Gri ve Riskli Bölge).
* **Sektör Kıyaslamalı Çarpanlar:** F/K, PD/DD, FD/FAVÖK ve PEG oranlarının sektör ortalamalarıyla fark analizi.
* **Canlı DCF Hesaplayıcısı:** Büyüme oranı, WACC ve nihai büyüme oranlarını anlık değiştiren slider'lar ile hisse başı içsel değer ve güvenlik marjı hesabı.

### 4. Çoklu Vade Kantitatif Tahmin Merkezi
* **Günlük (T+1):** Wilder `ATR(14)` taban/tavan beklenen oynaklık bandı, yön olasılığı ve 7 seviyeli Klasik Pivotlar (S3..R3).
* **Kısa Vade (20 İş Günü):** Sönümlenmiş **Holt's Linear Trend** (%40) + **OLS Lineer Regresyon** ($R^2$ uyumlu, %35) + **50G Ortalamaya Dönüş** (%25) modellerinin bileşkesi ve %80 güven aralığı.
* **Uzun Vade (12 Ay):** 500 yürüyüşlü deterministik **Monte Carlo Geometrik Brown Hareketi (GBM)** olasılık konisi (`P10 Ayı / P50 Medyan / P90 Boğa`) + DCF sentez bandı.

### 5. Strateji Backtest Laboratuvarı
* `EMA 9/21 Kesişimi` ve `RSI 30/70 Ortalamaya Dönüş` stratejileri.
* Son 1 yıllık net getiri, Al-Tut (Buy & Hold) kıyaslaması, **Alfa**, Kazanma Oranı, **Max Drawdown** ve **Sharpe Oranı**.
* Baz=100 normalize çizgisel SVG özkaynak eğrisi ve simüle edilen işlem geçmişi dökümü.

### 6. Sanal Portföy & %95 Riske Maruz Değer (VaR)
* BIST ve ABD hisselerini tek listede takip; canlı `USD/TRY` kuruyla Türk Lirası cinsinden net değer ve kâr/zarar.
* Portföy ağırlıklı **Beta**, **Sharpe Oranı**, **Yıllık Volatilite** ve **1 Günlük %95 VaR** (Riske Maruz Değer).
* Renkli sektör dağılımı şeridi, `LocalStorage` kalıcılığı ve tek tıkla **JSON Dışa/İçe Aktarım**.

---

## 🛠️ Mimari & Teknoloji Yığını

```
alphadesk-terminal/
├── .github/workflows/
│   ├── deploy.yml               # GitHub Pages otomatik yayın zinciri
│   └── update-market-data.yml   # Hafta içi borsa kapanışında veri çeken ETL botu
├── public/
│   └── market-data.json         # 120 hisse & makro serisinin 365 günlük JSON veritabanı
├── scripts/
│   ├── fetch_market_data.py     # yfinance + ThreadPoolExecutor ile paralel veri çekici
│   └── requirements.txt         # Python bağımlılıkları (yfinance, pandas)
├── src/
│   ├── components/
│   │   ├── analysis/            # TechnicalConsensus, FundamentalXRay, DcfCalculator
│   │   ├── chart/               # ProChart (Midas line + TV candle), IndicatorToolbar, SubChartPanel
│   │   ├── forecast/            # MultiHorizonForecast, MonteCarloConeSvg
│   │   ├── layout/              # TopTicker, SidebarWatchlist, SettingsModal
│   │   └── portfolio/           # ScreenerHeatmap, BacktestLab, PortfolioRiskPanel
│   ├── data/
│   │   ├── dataAdapter.ts       # Hibrit veri bağlayıcısı (JSON + Cloudflare + API)
│   │   └── seedMarketData.ts    # Çevrimdışı tohum veriler & sektör kıyaslamaları
│   ├── engine/
│   │   ├── backtestEngine.ts    # Strateji simülasyonu & Portföy VaR motoru
│   │   ├── forecastEngine.ts    # Holt, OLS, ATR, Monte Carlo deterministik PRNG motoru
│   │   ├── fundamentalScoring.ts# Piotroski F-Score, Altman Z, Gordon DCF motoru
│   │   └── technicalIndicators.ts# EMA, SMA, RSI, MACD, Bollinger, ATR, Stochastic, Pivot
│   ├── hooks/
│   │   └── useTerminalStore.ts  # LocalStorage kalıcı durum store'u
│   └── App.tsx                  # 5 sekmeli ana terminal orkestrasyonu
├── worker/
│   └── yahoo-proxy.js           # Cloudflare Edge Worker (CORS + 5 dk önbellek)
└── wrangler.toml                # Cloudflare Worker yapılandırması
```

---

## 🚀 Yerel Kurulum & Çalıştırma

### 1. Gereksinimler
* Node.js 18+
* Projede taşınabilir Python ortamı hazırdır (ek bir kurulum gerektirmez).

### 2. Hızlı Başlatma (Masaüstü / Klasörden Çift Tıkla)
Proje kökündeki **`BASLAT.bat`** (veya masaüstünüzdeki kısayol) dosyasına çift tıklayın:
* Sunucu otomatik ayağa kalkar ve tarayıcınızda `http://localhost:5173` adresinde terminal açılır.

### 3. Komut Satırından Başlatma
```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# 120 hissenin verilerini yeniden tazelemek için
npm run update-data

# Üretim derlemesi (Production Build)
npm run build
```

---

## ⚖️ Yasal Uyarı / Disclaimer

Bu yazılım tamamen akademik, istatistiksel ve kantitatif araştırma amaçlarıyla geliştirilmiştir. Burada sunulan hiçbir veri, tahmin, skorlama (Piotroski, Altman Z), Monte Carlo simülasyonu veya DCF değeri **yatırım tavsiyesi (YTD)** niteliğinde değildir. Yatırım kararlarınızı lisanslı bir finansal danışman eşliğinde ve kendi risk profilinize uygun olarak vermeniz tavsiye edilir.

---

## 📄 Lisans
Bu proje [MIT Lisansı](LICENSE) altında açık kaynak olarak sunulmuştur.
