import asyncio
from datetime import datetime

from src.models.case_schema import FXRateQuote


def _fetch_rate_with_yfinance(ticker: str) -> FXRateQuote:
    import yfinance as yf

    instrument = yf.Ticker(ticker)
    history = instrument.history(period="5d", interval="1d")
    if history.empty:
        raise ValueError(f"No FX history returned for ticker '{ticker}'")

    close_series = history.get("Close")
    if close_series is None or close_series.dropna().empty:
        raise ValueError(f"No FX close price returned for ticker '{ticker}'")

    rate = float(close_series.dropna().iloc[-1])

    as_of = None
    try:
        idx = history.index[-1]
        if hasattr(idx, "to_pydatetime"):
            idx = idx.to_pydatetime()
        if isinstance(idx, datetime):
            as_of = idx.isoformat()
    except Exception:  # noqa: BLE001
        as_of = None

    return FXRateQuote(
        provider="yfinance",
        base="EUR",
        quote="VND",
        rate=rate,
        as_of=as_of,
    )


async def fetch_eur_vnd_rate(
    *,
    ticker: str = "EURVND=X",
    fallback_rate: float | None = None,
) -> FXRateQuote:
    try:
        return await asyncio.to_thread(_fetch_rate_with_yfinance, ticker.strip())
    except Exception:
        if fallback_rate is not None:
            return FXRateQuote(
                provider="fallback",
                base="EUR",
                quote="VND",
                rate=float(fallback_rate),
                as_of=None,
            )
        raise
