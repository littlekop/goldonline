import { NextResponse } from "next/server";

const GRAM_PER_BAHT = 15.244;
const GRAM_PER_OZ = 31.1034768;
const BAHT_TO_OZ = GRAM_PER_BAHT / GRAM_PER_OZ;

const THAI_BAR_PURITY = 0.965;
const BAR_SPREAD_THB = 100;
const JEWELRY_PREMIUM_THB = 500;

export const revalidate = 0;

type GtaLatest = {
  bL_BuyPrice: number;
  bL_SellPrice: number;
  oM965_BuyPrice: number;
  oM965_SellPrice: number;
  goldSpot: number;
  bahtPerUSD: number;
  asTime: string;
};

// Primary source: the Gold Traders Association of Thailand's own public price feed
// (the same endpoint goldtraders.or.th's front-end calls to render its price board).
// This is the real board price, not an estimate.
async function fetchFromGta() {
  const res = await fetch("https://www.goldtraders.or.th/api/GoldPrices/Latest?readjson=false", {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; gold-tracker/1.0)" },
  });
  if (!res.ok) throw new Error(`GTA feed failed: ${res.status}`);
  const data = (await res.json()) as GtaLatest;

  const barBuy = Number(data.bL_BuyPrice);
  const barSell = Number(data.bL_SellPrice);
  const jewelryBuy = Number(data.oM965_BuyPrice);
  const jewelrySell = Number(data.oM965_SellPrice);
  const exchangeRate = Number(data.bahtPerUSD);
  const spotUsdPerOz = Number(data.goldSpot);

  if (![barBuy, barSell, jewelryBuy, jewelrySell].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("GTA feed returned incomplete data");
  }

  return {
    market: { barBuy, barSell, jewelryBuy, jewelrySell },
    exchangeRate: Number.isFinite(exchangeRate) && exchangeRate > 0 ? Number(exchangeRate.toFixed(2)) : null,
    spotUsdPerOz: Number.isFinite(spotUsdPerOz) && spotUsdPerOz > 0 ? spotUsdPerOz : null,
    asOf: data.asTime ?? null,
  };
}

// Fallback: world gold spot price converted with an illustrative premium.
// Only used if the GTA feed is unreachable — clearly flagged as an estimate.
async function fetchEstimateFromWorldSpot() {
  let exchangeRate: number | null = null;
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=THB", { cache: "no-store" });
    const data = await res.json();
    const rate = Number(data?.rates?.THB);
    if (Number.isFinite(rate) && rate > 0) exchangeRate = Number(rate.toFixed(2));
  } catch {
    // exchangeRate stays null
  }

  const res = await fetch("https://api.goldprice.dev/v1/prices?symbol=XAU-USD-SPOT", { cache: "no-store" });
  const data = await res.json();
  const spot = Number(data?.symbols?.[0]?.price);
  if (!Number.isFinite(spot) || spot <= 0) throw new Error("world spot feed returned no price");

  const rateForCalc = exchangeRate ?? 32.5;
  const fineGoldPerBahtThb = spot * BAHT_TO_OZ * rateForCalc;
  const bar965 = fineGoldPerBahtThb * THAI_BAR_PURITY;
  const barSell = Math.round(bar965 / 50) * 50;
  const barBuy = barSell - BAR_SPREAD_THB;

  return {
    market: {
      barBuy,
      barSell,
      jewelryBuy: barBuy - JEWELRY_PREMIUM_THB,
      jewelrySell: barSell + JEWELRY_PREMIUM_THB,
    },
    exchangeRate,
    spotUsdPerOz: spot,
    asOf: null as string | null,
  };
}

export async function GET() {
  try {
    const result = await fetchFromGta();
    return NextResponse.json({ ...result, source: "gta", fetchedAt: new Date().toISOString() });
  } catch {
    try {
      const result = await fetchEstimateFromWorldSpot();
      return NextResponse.json({ ...result, source: "estimate", fetchedAt: new Date().toISOString() });
    } catch {
      return NextResponse.json({
        market: null,
        exchangeRate: null,
        spotUsdPerOz: null,
        asOf: null,
        source: "none",
        fetchedAt: new Date().toISOString(),
      });
    }
  }
}
