import asyncio
from datetime import datetime

from src.models.case_schema import CarbonPriceQuote


def _fetch_quote_with_yfinance(tickers: list[str]) -> CarbonPriceQuote:
    import yfinance as yf

    for ticker in tickers:
        ticker = ticker.strip()
        if not ticker:
            continue
        try:
            instrument = yf.Ticker(ticker)
            history = instrument.history(period="5d", interval="1d")
            if history.empty:
                continue
            close_series = history.get("Close")
            if close_series is None or close_series.dropna().empty:
                continue
            close_price = float(close_series.dropna().iloc[-1])

            as_of = None
            try:
                idx = history.index[-1]
                if hasattr(idx, "to_pydatetime"):
                    idx = idx.to_pydatetime()
                if isinstance(idx, datetime):
                    as_of = idx.isoformat()
            except Exception:  # noqa: BLE001
                as_of = None

            currency = None
            try:
                fast_info = getattr(instrument, "fast_info", None)
                if fast_info is not None:
                    currency = fast_info.get("currency")
            except Exception:  # noqa: BLE001
                currency = None

            return CarbonPriceQuote(
                provider="yfinance",
                ticker=ticker,
                price=close_price,
                currency=currency,
                as_of=as_of,
            )
        except Exception:  # noqa: BLE001
            continue
    raise ValueError("Unable to fetch carbon price from configured yfinance tickers")


async def fetch_carbon_price_quote(*, tickers: str, fallback_eur: float | None = None) -> CarbonPriceQuote:
    ticker_list = [value.strip() for value in tickers.split(",") if value.strip()]
    if not ticker_list:
        raise ValueError("No carbon price tickers configured")

    try:
        return await asyncio.to_thread(_fetch_quote_with_yfinance, ticker_list)
    except Exception:
        if fallback_eur is not None:
            return CarbonPriceQuote(
                provider="fallback",
                ticker="FALLBACK_EUR",
                price=float(fallback_eur),
                currency="EUR",
                as_of=None,
            )
        raise
