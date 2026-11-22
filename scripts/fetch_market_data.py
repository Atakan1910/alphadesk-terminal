import json
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf

# BIST 100 Ana Evreni (95 Hisse) + Global Devler (25 Hisse) = 120 Hisse
SYMBOLS: list[dict[str, str]] = [
    # --- BIST ---
    {"symbol": "THYAO", "yf": "THYAO.IS", "name": "Türk Hava Yolları", "market": "BIST", "currency": "TRY", "sector": "Havacılık"},
    {"symbol": "PGSUS", "yf": "PGSUS.IS", "name": "Pegasus Hava Taşımacılığı", "market": "BIST", "currency": "TRY", "sector": "Havacılık"},
    {"symbol": "TAVHL", "yf": "TAVHL.IS", "name": "TAV Havalimanları", "market": "BIST", "currency": "TRY", "sector": "Havacılık"},
    {"symbol": "ASELS", "yf": "ASELS.IS", "name": "Aselsan Elektronik", "market": "BIST", "currency": "TRY", "sector": "Savunma"},
    {"symbol": "SDTTR", "yf": "SDTTR.IS", "name": "SDT Uzay ve Savunma", "market": "BIST", "currency": "TRY", "sector": "Savunma"},
    {"symbol": "TUPRS", "yf": "TUPRS.IS", "name": "Tüpraş Rafinerileri", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "ASTOR", "yf": "ASTOR.IS", "name": "Astor Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "ENJSA", "yf": "ENJSA.IS", "name": "Enerjisa Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "AKSEN", "yf": "AKSEN.IS", "name": "Aksa Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "ODAS", "yf": "ODAS.IS", "name": "Odaş Elektrik", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "ZOREN", "yf": "ZOREN.IS", "name": "Zorlu Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "CWENE", "yf": "CWENE.IS", "name": "CW Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "SMRTG", "yf": "SMRTG.IS", "name": "Smart Güneş Enerjisi", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "EUPWR", "yf": "EUPWR.IS", "name": "Europower Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "GESAN", "yf": "GESAN.IS", "name": "Girişim Elektrik", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "KONTR", "yf": "KONTR.IS", "name": "Kontrolmatik Teknoloji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "ALFAS", "yf": "ALFAS.IS", "name": "Alfa Solar Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "GWIND", "yf": "GWIND.IS", "name": "Galata Wind Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "CANTE", "yf": "CANTE.IS", "name": "Çan2 Termik", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "AKFYE", "yf": "AKFYE.IS", "name": "Akfen Yenilenebilir Enerji", "market": "BIST", "currency": "TRY", "sector": "Enerji"},
    {"symbol": "KCHOL", "yf": "KCHOL.IS", "name": "Koç Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "SAHOL", "yf": "SAHOL.IS", "name": "Sabancı Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "AGHOL", "yf": "AGHOL.IS", "name": "AG Anadolu Grubu Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "ALARK", "yf": "ALARK.IS", "name": "Alarko Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "DOHOL", "yf": "DOHOL.IS", "name": "Doğan Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "TKFEN", "yf": "TKFEN.IS", "name": "Tekfen Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "ENKAI", "yf": "ENKAI.IS", "name": "Enka İnşaat", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "BERA", "yf": "BERA.IS", "name": "Bera Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "GLYHO", "yf": "GLYHO.IS", "name": "Global Yatırım Holding", "market": "BIST", "currency": "TRY", "sector": "Holding"},
    {"symbol": "AKBNK", "yf": "AKBNK.IS", "name": "Akbank", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "GARAN", "yf": "GARAN.IS", "name": "Garanti BBVA", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "ISCTR", "yf": "ISCTR.IS", "name": "Türkiye İş Bankası (C)", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "YKBNK", "yf": "YKBNK.IS", "name": "Yapı Kredi Bankası", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "HALKB", "yf": "HALKB.IS", "name": "Halkbank", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "VAKBN", "yf": "VAKBN.IS", "name": "VakıfBank", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "TSKB", "yf": "TSKB.IS", "name": "TSKB", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "SKBNK", "yf": "SKBNK.IS", "name": "Şekerbank", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "ALBRK", "yf": "ALBRK.IS", "name": "Albaraka Türk", "market": "BIST", "currency": "TRY", "sector": "Bankacılık"},
    {"symbol": "ISMEN", "yf": "ISMEN.IS", "name": "İş Yatırım Menkul Değerler", "market": "BIST", "currency": "TRY", "sector": "Finans"},
    {"symbol": "TURSG", "yf": "TURSG.IS", "name": "Türkiye Sigorta", "market": "BIST", "currency": "TRY", "sector": "Finans"},
    {"symbol": "ANSGR", "yf": "ANSGR.IS", "name": "Anadolu Sigorta", "market": "BIST", "currency": "TRY", "sector": "Finans"},
    {"symbol": "BIMAS", "yf": "BIMAS.IS", "name": "BİM Birleşik Mağazalar", "market": "BIST", "currency": "TRY", "sector": "Perakende"},
    {"symbol": "MGROS", "yf": "MGROS.IS", "name": "Migros Ticaret", "market": "BIST", "currency": "TRY", "sector": "Perakende"},
    {"symbol": "SOKM", "yf": "SOKM.IS", "name": "Şok Marketler", "market": "BIST", "currency": "TRY", "sector": "Perakende"},
    {"symbol": "MAVI", "yf": "MAVI.IS", "name": "Mavi Giyim", "market": "BIST", "currency": "TRY", "sector": "Perakende"},
    {"symbol": "TABGD", "yf": "TABGD.IS", "name": "TAB Gıda", "market": "BIST", "currency": "TRY", "sector": "Perakende"},
    {"symbol": "CCOLA", "yf": "CCOLA.IS", "name": "Coca-Cola İçecek", "market": "BIST", "currency": "TRY", "sector": "Gıda & İçecek"},
    {"symbol": "AEFES", "yf": "AEFES.IS", "name": "Anadolu Efes", "market": "BIST", "currency": "TRY", "sector": "Gıda & İçecek"},
    {"symbol": "ULKER", "yf": "ULKER.IS", "name": "Ülker Bisküvi", "market": "BIST", "currency": "TRY", "sector": "Gıda & İçecek"},
    {"symbol": "KAYSE", "yf": "KAYSE.IS", "name": "Kayseri Şeker", "market": "BIST", "currency": "TRY", "sector": "Gıda & İçecek"},
    {"symbol": "FROTO", "yf": "FROTO.IS", "name": "Ford Otosan", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},
    {"symbol": "TOASO", "yf": "TOASO.IS", "name": "Tofaş Oto Fabrikaları", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},
    {"symbol": "DOAS", "yf": "DOAS.IS", "name": "Doğuş Otomotiv", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},
    {"symbol": "TTRAK", "yf": "TTRAK.IS", "name": "TürkTraktör", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},
    {"symbol": "OTKAR", "yf": "OTKAR.IS", "name": "Otokar", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},
    {"symbol": "BRISA", "yf": "BRISA.IS", "name": "Brisa Bridgestone", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},
    {"symbol": "TMSN", "yf": "TMSN.IS", "name": "Tümosan Motor", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},
    {"symbol": "SISE", "yf": "SISE.IS", "name": "Şişecam", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "EREGL", "yf": "EREGL.IS", "name": "Erdemir Demir Çelik", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "KRDMD", "yf": "KRDMD.IS", "name": "Kardemir (D)", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "ISDMR", "yf": "ISDMR.IS", "name": "İskenderun Demir Çelik", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "ARCLK", "yf": "ARCLK.IS", "name": "Arçelik", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "VESBE", "yf": "VESBE.IS", "name": "Vestel Beyaz Eşya", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "VESTL", "yf": "VESTL.IS", "name": "Vestel Elektronik", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "SASA", "yf": "SASA.IS", "name": "SASA Polyester", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "PETKM", "yf": "PETKM.IS", "name": "Petkim Petrokimya", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "HEKTS", "yf": "HEKTS.IS", "name": "Hektaş Ticaret", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "GUBRF", "yf": "GUBRF.IS", "name": "Gübre Fabrikaları", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "AKSA", "yf": "AKSA.IS", "name": "Aksa Akrilik", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "KCAER", "yf": "KCAER.IS", "name": "Kocaer Çelik", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "BRSAN", "yf": "BRSAN.IS", "name": "Borusan Boru", "market": "BIST", "currency": "TRY", "sector": "Sanayi"},
    {"symbol": "OYAKC", "yf": "OYAKC.IS", "name": "OYAK Çimento", "market": "BIST", "currency": "TRY", "sector": "Çimento & İnşaat"},
    {"symbol": "CIMSA", "yf": "CIMSA.IS", "name": "Çimsa Çimento", "market": "BIST", "currency": "TRY", "sector": "Çimento & İnşaat"},
    {"symbol": "AKCNS", "yf": "AKCNS.IS", "name": "Akçansa Çimento", "market": "BIST", "currency": "TRY", "sector": "Çimento & İnşaat"},
    {"symbol": "BTCIM", "yf": "BTCIM.IS", "name": "Batıçim Çimento", "market": "BIST", "currency": "TRY", "sector": "Çimento & İnşaat"},
    {"symbol": "BSOKE", "yf": "BSOKE.IS", "name": "Batısöke Çimento", "market": "BIST", "currency": "TRY", "sector": "Çimento & İnşaat"},
    {"symbol": "KOZAL", "yf": "KOZAL.IS", "name": "Koza Altın İşletmeleri", "market": "BIST", "currency": "TRY", "sector": "Madencilik"},
    {"symbol": "KOZAA", "yf": "KOZAA.IS", "name": "Koza Anadolu Metal", "market": "BIST", "currency": "TRY", "sector": "Madencilik"},
    {"symbol": "IPEKE", "yf": "IPEKE.IS", "name": "İpek Doğal Enerji", "market": "BIST", "currency": "TRY", "sector": "Madencilik"},
    {"symbol": "TCELL", "yf": "TCELL.IS", "name": "Turkcell İletişim", "market": "BIST", "currency": "TRY", "sector": "Telekom"},
    {"symbol": "TTKOM", "yf": "TTKOM.IS", "name": "Türk Telekom", "market": "BIST", "currency": "TRY", "sector": "Telekom"},
    {"symbol": "MIATK", "yf": "MIATK.IS", "name": "MİA Teknoloji", "market": "BIST", "currency": "TRY", "sector": "Teknoloji"},
    {"symbol": "LOGO", "yf": "LOGO.IS", "name": "Logo Yazılım", "market": "BIST", "currency": "TRY", "sector": "Teknoloji"},
    {"symbol": "REEDR", "yf": "REEDR.IS", "name": "Reeder Teknoloji", "market": "BIST", "currency": "TRY", "sector": "Teknoloji"},
    {"symbol": "YEOTK", "yf": "YEOTK.IS", "name": "YEO Teknoloji", "market": "BIST", "currency": "TRY", "sector": "Teknoloji"},
    {"symbol": "EKGYO", "yf": "EKGYO.IS", "name": "Emlak Konut GYO", "market": "BIST", "currency": "TRY", "sector": "GYO"},
    {"symbol": "ISGYO", "yf": "ISGYO.IS", "name": "İş GYO", "market": "BIST", "currency": "TRY", "sector": "GYO"},
    {"symbol": "TRGYO", "yf": "TRGYO.IS", "name": "Torunlar GYO", "market": "BIST", "currency": "TRY", "sector": "GYO"},
    {"symbol": "AKFGY", "yf": "AKFGY.IS", "name": "Akfen GYO", "market": "BIST", "currency": "TRY", "sector": "GYO"},
    {"symbol": "MPARK", "yf": "MPARK.IS", "name": "MLP Sağlık (Medical Park)", "market": "BIST", "currency": "TRY", "sector": "Sağlık"},
    {"symbol": "ECILC", "yf": "ECILC.IS", "name": "Eczacıbaşı İlaç", "market": "BIST", "currency": "TRY", "sector": "Sağlık"},
    {"symbol": "SELEC", "yf": "SELEC.IS", "name": "Selçuk Ecza Deposu", "market": "BIST", "currency": "TRY", "sector": "Sağlık"},
    {"symbol": "CLEBI", "yf": "CLEBI.IS", "name": "Çelebi Hava Servisi", "market": "BIST", "currency": "TRY", "sector": "Havacılık"},
    {"symbol": "KONYA", "yf": "KONYA.IS", "name": "Konya Çimento", "market": "BIST", "currency": "TRY", "sector": "Çimento & İnşaat"},
    {"symbol": "EGEEN", "yf": "EGEEN.IS", "name": "Ege Endüstri", "market": "BIST", "currency": "TRY", "sector": "Otomotiv"},

    # --- GLOBAL / ABD (25 Hisse) ---
    {"symbol": "AAPL", "yf": "AAPL", "name": "Apple Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "NVDA", "yf": "NVDA", "name": "NVIDIA Corporation", "market": "GLOBAL", "currency": "USD", "sector": "Yarıİletken"},
    {"symbol": "MSFT", "yf": "MSFT", "name": "Microsoft Corporation", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "TSLA", "yf": "TSLA", "name": "Tesla, Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Otomotiv"},
    {"symbol": "AMZN", "yf": "AMZN", "name": "Amazon.com, Inc.", "market": "GLOBAL", "currency": "USD", "sector": "E-Ticaret"},
    {"symbol": "GOOGL", "yf": "GOOGL", "name": "Alphabet Inc. (Google)", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "META", "yf": "META", "name": "Meta Platforms", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "AMD", "yf": "AMD", "name": "Advanced Micro Devices", "market": "GLOBAL", "currency": "USD", "sector": "Yarıİletken"},
    {"symbol": "AVGO", "yf": "AVGO", "name": "Broadcom Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Yarıİletken"},
    {"symbol": "INTC", "yf": "INTC", "name": "Intel Corporation", "market": "GLOBAL", "currency": "USD", "sector": "Yarıİletken"},
    {"symbol": "NFLX", "yf": "NFLX", "name": "Netflix, Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "ORCL", "yf": "ORCL", "name": "Oracle Corporation", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "CRM", "yf": "CRM", "name": "Salesforce, Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "PLTR", "yf": "PLTR", "name": "Palantir Technologies", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
    {"symbol": "JPM", "yf": "JPM", "name": "JPMorgan Chase", "market": "GLOBAL", "currency": "USD", "sector": "Bankacılık"},
    {"symbol": "BAC", "yf": "BAC", "name": "Bank of America", "market": "GLOBAL", "currency": "USD", "sector": "Bankacılık"},
    {"symbol": "V", "yf": "V", "name": "Visa Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Finans"},
    {"symbol": "MA", "yf": "MA", "name": "Mastercard Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Finans"},
    {"symbol": "XOM", "yf": "XOM", "name": "Exxon Mobil", "market": "GLOBAL", "currency": "USD", "sector": "Enerji"},
    {"symbol": "WMT", "yf": "WMT", "name": "Walmart Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Perakende"},
    {"symbol": "KO", "yf": "KO", "name": "The Coca-Cola Company", "market": "GLOBAL", "currency": "USD", "sector": "Gıda & İçecek"},
    {"symbol": "PEP", "yf": "PEP", "name": "PepsiCo, Inc.", "market": "GLOBAL", "currency": "USD", "sector": "Gıda & İçecek"},
    {"symbol": "JNJ", "yf": "JNJ", "name": "Johnson & Johnson", "market": "GLOBAL", "currency": "USD", "sector": "Sağlık"},
    {"symbol": "UNH", "yf": "UNH", "name": "UnitedHealth Group", "market": "GLOBAL", "currency": "USD", "sector": "Sağlık"},
    {"symbol": "DIS", "yf": "DIS", "name": "The Walt Disney Company", "market": "GLOBAL", "currency": "USD", "sector": "Teknoloji"},
]

MACRO_SYMBOLS = [
    {"symbol": "XU100", "yf": "XU100.IS", "label": "BIST 100", "prefix": ""},
    {"symbol": "SPX", "yf": "^GSPC", "label": "S&P 500", "prefix": ""},
    {"symbol": "USDTRY", "yf": "USDTRY=X", "label": "USD/TRY", "prefix": "₺"},
    {"symbol": "XAUUSD", "yf": "GC=F", "label": "ALTIN (ONS)", "prefix": "$"},
    {"symbol": "VIX", "yf": "^VIX", "label": "VIX", "prefix": ""},
]


def safe_float(val: Any, default: float = 0.0) -> float:
    try:
        if val is None or pd.isna(val):
            return default
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except Exception:
        return default


def round2(val: Any) -> float:
    return round(safe_float(val), 2)


def pick_row(df: pd.DataFrame | None, col: Any, candidates: list[str], default: float = 0.0) -> float:
    if df is None or df.empty or col is None or col not in df.columns:
        return default
    for name in candidates:
        if name in df.index:
            val = df.loc[name, col]
            if isinstance(val, pd.Series):
                val = val.iloc[0]
            if not pd.isna(val):
                return safe_float(val, default)
    return default


def extract_bars_from_df(df: pd.DataFrame | None) -> list[dict[str, Any]]:
    if df is None or df.empty:
        return []
    sub = df.dropna(subset=["Open", "High", "Low", "Close"]).tail(365)
    bars: list[dict[str, Any]] = []
    for idx, row in sub.iterrows():
        o = round2(row["Open"])
        h = round2(row["High"])
        l = round2(row["Low"])
        c = round2(row["Close"])
        if c <= 0 or o <= 0 or h <= 0 or l <= 0:
            continue
        bars.append(
            {
                "time": pd.to_datetime(idx).strftime("%Y-%m-%d"),
                "open": o,
                "high": max(h, o, c),
                "low": min(l, o, c),
                "close": c,
                "volume": int(max(0, safe_float(row.get("Volume", 0)))),
            }
        )
    return bars


def extract_quarters(ticker: yf.Ticker) -> list[dict[str, Any]]:
    try:
        inc = ticker.quarterly_income_stmt
        bal = ticker.quarterly_balance_sheet
        cf = ticker.quarterly_cashflow
    except Exception:
        return []

    if inc is None or inc.empty:
        return []

    cols = sorted(list(inc.columns))
    quarters: list[dict[str, Any]] = []
    to_m = 1e6

    for col in cols:
        dt = pd.to_datetime(col)
        q_num = (dt.month - 1) // 3 + 1
        period = f"{dt.year} Q{q_num}"

        revenue = pick_row(inc, col, ["Total Revenue", "Operating Revenue"]) / to_m
        if revenue <= 0:
            continue

        gross_profit = pick_row(inc, col, ["Gross Profit"]) / to_m
        ebitda = pick_row(inc, col, ["EBITDA", "Normalized EBITDA"]) / to_m
        op_income = pick_row(inc, col, ["Operating Income", "EBIT", "Total Operating Income As Reported"]) / to_m
        net_income = pick_row(
            inc,
            col,
            ["Net Income", "Net Income Common Stockholders", "Net Income Continuous Operations"],
        ) / to_m

        if gross_profit == 0:
            gross_profit = op_income if op_income > 0 else revenue * 0.25
        if ebitda == 0:
            ebitda = op_income if op_income > 0 else net_income * 1.25

        bal_col = (
            col
            if (bal is not None and not bal.empty and col in bal.columns)
            else (bal.columns[0] if (bal is not None and not bal.empty) else None)
        )
        cf_col = (
            col
            if (cf is not None and not cf.empty and col in cf.columns)
            else (cf.columns[0] if (cf is not None and not cf.empty) else None)
        )

        total_assets = pick_row(bal, bal_col, ["Total Assets"]) / to_m
        if total_assets <= 0:
            total_assets = max(1.0, revenue * 4.0)

        current_assets = pick_row(bal, bal_col, ["Current Assets"]) / to_m
        if current_assets <= 0:
            current_assets = total_assets * 0.35

        current_liab = pick_row(bal, bal_col, ["Current Liabilities"]) / to_m
        if current_liab <= 0:
            current_liab = total_assets * 0.25

        total_debt = pick_row(bal, bal_col, ["Total Debt", "Long Term Debt"]) / to_m
        cash = (
            pick_row(
                bal,
                bal_col,
                [
                    "Cash And Cash Equivalents",
                    "Cash Cash Equivalents And Short Term Investments",
                    "Cash Financial",
                ],
            )
            / to_m
        )
        equity = (
            pick_row(
                bal,
                bal_col,
                ["Stockholders Equity", "Common Stock Equity", "Total Equity Gross Minority Interest"],
            )
            / to_m
        )
        if equity <= 0:
            equity = total_assets * 0.35

        retained = pick_row(bal, bal_col, ["Retained Earnings"]) / to_m
        if retained == 0:
            retained = equity * 0.5

        ocf = (
            pick_row(
                cf,
                cf_col,
                ["Operating Cash Flow", "Cash Flow From Continuing Operating Activities"],
            )
            / to_m
        )
        if ocf == 0:
            ocf = net_income * 1.1

        capex = abs(pick_row(cf, cf_col, ["Capital Expenditure"])) / to_m
        if capex == 0:
            capex = revenue * 0.05

        shares = pick_row(bal, bal_col, ["Ordinary Shares Number", "Share Issued"]) / to_m
        if shares <= 0:
            try:
                fi = ticker.fast_info
                s_raw = safe_float(fi.get("shares", 0.0)) if hasattr(fi, "get") else safe_float(getattr(fi, "shares", 0.0))
                shares = s_raw / to_m if s_raw > 0 else 1000.0
            except Exception:
                shares = 1000.0

        quarters.append(
            {
                "period": period,
                "revenue": round2(revenue),
                "grossProfit": round2(gross_profit),
                "ebitda": round2(ebitda),
                "operatingIncome": round2(op_income),
                "netIncome": round2(net_income),
                "totalAssets": round2(max(1.0, total_assets)),
                "currentAssets": round2(max(1.0, current_assets)),
                "currentLiabilities": round2(max(1.0, current_liab)),
                "totalDebt": round2(max(0.0, total_debt)),
                "cashAndEquivalents": round2(max(0.0, cash)),
                "shareholdersEquity": round2(max(1.0, equity)),
                "retainedEarnings": round2(retained),
                "operatingCashFlow": round2(ocf),
                "capex": round2(capex),
                "sharesOutstanding": round2(max(0.1, shares)),
            }
        )

    return quarters


def fetch_macro() -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for item in MACRO_SYMBOLS:
        try:
            hist = yf.Ticker(item["yf"]).history(period="5d", interval="1d")
            if hist is None or hist.empty:
                continue
            closes = hist["Close"].dropna()
            if len(closes) < 2:
                continue
            last_close = safe_float(closes.iloc[-1])
            prev_close = safe_float(closes.iloc[-2])
            if last_close <= 0 or prev_close <= 0:
                continue
            change_pct = ((last_close - prev_close) / prev_close) * 100.0
            entry: dict[str, Any] = {
                "symbol": item["symbol"],
                "label": item["label"],
                "price": round2(last_close),
                "changePct": round2(change_pct),
            }
            if item["prefix"]:
                entry["prefix"] = item["prefix"]
            results.append(entry)
        except Exception as exc:
            print(f"[WARN] Macro {item['symbol']} alınamadı: {exc}")
    return results


def download_all_ohlcv(entries: list[dict[str, str]]) -> dict[str, list[dict[str, Any]]]:
    bars_by_symbol: dict[str, list[dict[str, Any]]] = {}
    batch_size = 40

    for i in range(0, len(entries), batch_size):
        chunk = entries[i : i + batch_size]
        yf_list = [e["yf"] for e in chunk]
        print(f"OHLCV toplu indiriliyor ({i + 1}-{min(i + batch_size, len(entries))}/{len(entries)})...")
        try:
            df = yf.download(
                tickers=yf_list,
                period="2y",
                interval="1d",
                auto_adjust=True,
                group_by="ticker",
                threads=True,
                progress=False,
            )
            if df is None or df.empty:
                continue

            for entry in chunk:
                yf_sym = entry["yf"]
                sym = entry["symbol"]
                try:
                    sub = df[yf_sym] if len(yf_list) > 1 else df
                    bars = extract_bars_from_df(sub)
                    if len(bars) >= 30:
                        bars_by_symbol[sym] = bars
                except Exception:
                    pass
        except Exception as exc:
            print(f"[WARN] Batch indirilemedi: {exc}")

    return bars_by_symbol


def fetch_financial_worker(entry: dict[str, str]) -> tuple[str, list[dict[str, Any]]]:
    try:
        ticker = yf.Ticker(entry["yf"])
        return entry["symbol"], extract_quarters(ticker)
    except Exception:
        return entry["symbol"], []


def main() -> None:
    out_path = Path("public/market-data.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    macro = fetch_macro()
    bars_map = download_all_ohlcv(SYMBOLS)
    valid_entries = [e for e in SYMBOLS if e["symbol"] in bars_map]

    print(f"Çeyreklik bilançolar çekiliyor ({len(valid_entries)} hisse)...")
    quarters_map: dict[str, list[dict[str, Any]]] = {}
    completed = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch_financial_worker, e): e["symbol"] for e in valid_entries}
        for fut in as_completed(futures):
            sym, q_list = fut.result()
            quarters_map[sym] = q_list
            completed += 1
            if completed % 25 == 0 or completed == len(valid_entries):
                print(f"  Bilanço ilerleme: {completed}/{len(valid_entries)}")

    stocks_payload: dict[str, Any] = {}
    for entry in valid_entries:
        sym = entry["symbol"]
        bars = bars_map[sym]
        stocks_payload[sym] = {
            "name": entry["name"],
            "market": entry["market"],
            "currency": entry["currency"],
            "sector": entry["sector"],
            "bars": bars,
            "quarters": quarters_map.get(sym, []),
            "lastUpdated": bars[-1]["time"],
        }

    payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "macro": macro,
        "stocks": stocks_payload,
    }

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Tamamlandı: {len(stocks_payload)} hisse, {len(macro)} makro -> {out_path}")


if __name__ == "__main__":
    main()

