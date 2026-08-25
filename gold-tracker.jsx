import React, { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, ResponsiveContainer } from "recharts";
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Info, Download, Share2, X, Calendar, Save, Bell, BookOpen } from "lucide-react";

const GRAM_PER_BAHT = 15.244;
const GRAM_PER_OZ = 31.1034768;
const BAHT_TO_OZ = GRAM_PER_BAHT / GRAM_PER_OZ;

const C = {
  paper: "#FAF6EE",
  ink: "#2B2420",
  inkSoft: "#7A7167",
  red: "#B23A2E",
  redSoft: "#F2E1DC",
  gold: "#A9821F",
  goldLine: "#D8C179",
  goldWash: "#F3EAD1",
  profit: "#3C6E47",
  loss: "#6B6258",
  card: "#FFFFFF",
};

const fmt = (n, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function Seal({ size = 30 }) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: C.red, transform: "rotate(45deg)", borderRadius: 4 }}
    >
      <span
        className="font-display text-[11px] font-bold"
        style={{ color: C.goldWash, transform: "rotate(-45deg)" }}
      >
        ทอง
      </span>
    </div>
  );
}

function Coin({ size = 30 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, border: `1.5px solid ${C.gold}` }}
    >
      <span
        style={{
          width: size * 0.34,
          height: size * 0.34,
          background: C.red,
          transform: "rotate(45deg)",
        }}
      />
    </span>
  );
}

function Ornament({ className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-px flex-1" style={{ background: C.goldLine }} />
      <span style={{ width: 5, height: 5, background: C.gold, transform: "rotate(45deg)" }} />
      <div className="h-px flex-1" style={{ background: C.goldLine }} />
    </div>
  );
}

function AdSlot({ label, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-md border border-dashed text-[11px] font-body ${className}`}
      style={{ borderColor: C.goldLine, color: C.inkSoft, background: C.goldWash }}
    >
      {label}
    </div>
  );
}

function PriceRow({ label, buy, sell, digits }) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: `1px solid ${C.goldWash}` }}>
      <Coin size={26} />
      <span className="font-body text-sm flex-1" style={{ color: C.ink }}>{label}</span>
      <div className="text-right">
        <div className="font-body text-[10px] uppercase tracking-wide" style={{ color: C.inkSoft }}>รับซื้อ</div>
        <div className="font-mono-led text-sm font-bold" style={{ color: C.ink }}>{fmt(buy, digits)}</div>
      </div>
      <div className="text-right">
        <div className="font-body text-[10px] uppercase tracking-wide" style={{ color: C.inkSoft }}>ขายออก</div>
        <div className="font-mono-led text-sm font-bold" style={{ color: C.gold }}>{fmt(sell, digits)}</div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent, className = "" }) {
  return (
    <div className={`rounded-lg p-3 ${className}`} style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
      <div className="font-body text-[11px]" style={{ color: C.inkSoft }}>{label}</div>
      <div className="font-mono-led text-lg font-bold" style={{ color: accent || C.ink }}>{value}</div>
      {sub && <div className="font-body text-xs font-medium" style={{ color: accent }}>{sub}</div>}
    </div>
  );
}

export default function GoldTracker() {
  const [currency, setCurrency] = useState("THB");
  const [exchangeRate, setExchangeRate] = useState(32.5);
  const [market, setMarket] = useState({ barBuy: 70200, barSell: 70300, jewelryBuy: 68700, jewelrySell: 70800 });
  const [valuationBasis, setValuationBasis] = useState("barBuy");
  const [entries, setEntries] = useState([
    { id: 1, label: "ซื้อครั้งที่ 1", type: "bar", weight: 1, unit: "baht", price: 68500, makingCharge: 0 },
    { id: 2, label: "ซื้อครั้งที่ 2", type: "bar", weight: 0.5, unit: "baht", price: 69800, makingCharge: 0 },
  ]);
  const nextId = React.useRef(3);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [shareNote, setShareNote] = useState("");

  const [rateStatus, setRateStatus] = useState("loading"); // loading | live | manual
  const [now, setNow] = useState(new Date());

  const [historyDates, setHistoryDates] = useState([]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState("");
  const [historySnapshot, setHistorySnapshot] = useState(null);
  const [historyNote, setHistoryNote] = useState("");

  const todayKey = now.toISOString().slice(0, 10);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // fetch live THB/USD exchange rate once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=THB");
        const data = await res.json();
        const rate = data?.rates?.THB;
        if (!cancelled && rate) {
          setExchangeRate(Number(rate.toFixed(2)));
          setRateStatus("live");
        } else if (!cancelled) {
          setRateStatus("manual");
        }
      } catch {
        if (!cancelled) setRateStatus("manual");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // load list of saved history snapshots
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.list("gold-history:");
        const keys = (res?.keys || []).sort().reverse();
        setHistoryDates(keys.map((k) => k.replace("gold-history:", "")));
      } catch {
        setHistoryDates([]);
      }
    })();
  }, []);

  async function saveTodaySnapshot() {
    setHistoryNote("");
    try {
      const snapshot = { date: todayKey, market, exchangeRate, savedAt: new Date().toISOString() };
      const res = await window.storage.set(`gold-history:${todayKey}`, JSON.stringify(snapshot));
      if (res) {
        setHistoryDates((ds) => (ds.includes(todayKey) ? ds : [todayKey, ...ds].sort().reverse()));
        setHistoryNote("บันทึกราคาวันนี้แล้ว");
      } else {
        setHistoryNote("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    } catch {
      setHistoryNote("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function loadHistorySnapshot(dateKey) {
    setSelectedHistoryDate(dateKey);
    setHistorySnapshot(null);
    if (!dateKey) return;
    try {
      const res = await window.storage.get(`gold-history:${dateKey}`);
      if (res?.value) setHistorySnapshot(JSON.parse(res.value));
    } catch {
      setHistoryNote("ดึงข้อมูลวันที่เลือกไม่สำเร็จ");
    }
  }

  function applyHistoryAsMarket() {
    if (!historySnapshot) return;
    setMarket(historySnapshot.market);
    setExchangeRate(historySnapshot.exchangeRate);
    setHistoryNote(`ใช้ราคาของวันที่ ${historySnapshot.date} เป็นราคาตลาดปัจจุบันแล้ว`);
  }

  // fetch the most recent saved snapshot before today, for a "change vs last save" badge
  const [prevSnapshot, setPrevSnapshot] = useState(null);
  useEffect(() => {
    (async () => {
      const prevDate = historyDates.find((d) => d !== todayKey);
      if (!prevDate) {
        setPrevSnapshot(null);
        return;
      }
      try {
        const res = await window.storage.get(`gold-history:${prevDate}`);
        if (res?.value) setPrevSnapshot(JSON.parse(res.value));
      } catch {
        setPrevSnapshot(null);
      }
    })();
  }, [historyDates, todayKey]);

  const priceChangePct = prevSnapshot
    ? ((market.barSell - prevSnapshot.market.barSell) / prevSnapshot.market.barSell) * 100
    : null;

  // price alert (works only while this tab/page stays open)
  const [alertTarget, setAlertTarget] = useState("");
  const [alertDirection, setAlertDirection] = useState("above");
  const [alertArmed, setAlertArmed] = useState(false);
  const [alertNote, setAlertNote] = useState("");

  async function armAlert() {
    setAlertNote("");
    if (!alertTarget || Number(alertTarget) <= 0) {
      setAlertNote("กรุณากรอกราคาเป้าหมายก่อน");
      return;
    }
    if (typeof Notification !== "undefined") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setAlertNote("ต้องอนุญาตการแจ้งเตือนของเบราว์เซอร์ก่อนถึงจะตั้งได้");
          return;
        }
      } catch {
        setAlertNote("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
        return;
      }
    } else {
      setAlertNote("เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน");
      return;
    }
    setAlertArmed(true);
    setAlertNote("ตั้งแจ้งเตือนแล้ว ต้องเปิดหน้านี้ทิ้งไว้ถึงจะแจ้งได้");
  }

  useEffect(() => {
    if (!alertArmed || !alertTarget) return;
    const target = Number(alertTarget);
    const hit = alertDirection === "above" ? market.barSell >= target : market.barSell <= target;
    if (hit) {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("ราคาทองถึงเป้าหมายแล้ว", {
            body: `ทองแท่งขายออก ${fmt(market.barSell)} บาท (เป้าหมาย ${alertDirection === "above" ? "≥" : "≤"} ${fmt(target)})`,
          });
        }
      } catch {}
      setAlertArmed(false);
      setAlertNote(`ถึงเป้าหมายแล้ว! ราคาปัจจุบัน ${fmt(market.barSell)} บาท`);
    }
  }, [market.barSell, alertArmed, alertTarget, alertDirection]);

  const addEntry = () =>
    setEntries((es) => [...es, { id: nextId.current++, label: `ซื้อครั้งที่ ${es.length + 1}`, type: "bar", weight: 1, unit: "baht", price: market.barSell, makingCharge: 0 }]);
  const removeEntry = (id) => setEntries((es) => es.filter((e) => e.id !== id));
  const updateEntry = (id, patch) => setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const weightInBaht = (e) => {
    const raw = Number(e.weight) || 0;
    return e.unit === "salung" ? raw / 4 : raw;
  };

  const currentPrice = market[valuationBasis];

  const stats = useMemo(() => {
    const totalWeight = entries.reduce((s, e) => s + weightInBaht(e), 0);
    const totalCost = entries.reduce((s, e) => s + weightInBaht(e) * (Number(e.price) || 0) + (Number(e.makingCharge) || 0), 0);
    const avgCost = totalWeight ? totalCost / totalWeight : 0;
    const currentValue = totalWeight * currentPrice;
    const pl = currentValue - totalCost;
    const plPct = totalCost ? (pl / totalCost) * 100 : 0;
    return { totalWeight, totalCost, avgCost, currentValue, pl, plPct };
  }, [entries, currentPrice]);

  const toDisplay = (thb) => (currency === "THB" ? thb : thb / exchangeRate);
  const suffix = currency === "THB" ? "฿" : "$";
  const digits = currency === "THB" ? 0 : 2;

  const chartData = entries.map((e) => {
    const w = weightInBaht(e);
    const p = Number(e.price) || 0;
    const fee = Number(e.makingCharge) || 0;
    const pl = w * (currentPrice - p) - fee;
    return { name: e.label, pl: toDisplay(pl), fill: pl >= 0 ? C.profit : C.loss };
  });

  async function generateInfographic() {
    setGenerating(true);
    setShareNote("");
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.load("700 30px 'Noto Serif Thai'");
        await document.fonts.load("400 16px Sarabun");
        await document.fonts.load("700 16px 'Space Mono'");
        await document.fonts.ready;
      }
      const w = 720;
      const rowH = 58;
      const barsH = Math.max(entries.length, 1) * 46 + 40;
      const h = 1180 + barsH;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      // background
      ctx.fillStyle = C.paper;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = C.red;
      ctx.fillRect(0, 0, w, 6);

      // header
      ctx.fillStyle = C.red;
      rrPath(ctx, 44, 40, 46, 46, 8);
      ctx.fill();
      ctx.fillStyle = C.goldWash;
      ctx.font = "700 15px 'Noto Serif Thai'";
      ctx.textAlign = "center";
      ctx.fillText("ทอง", 44 + 23, 40 + 30);
      ctx.textAlign = "left";

      ctx.fillStyle = C.ink;
      ctx.font = "700 30px 'Noto Serif Thai'";
      ctx.fillText("สรุปพอร์ตทองคำของฉัน", 108, 66);
      ctx.fillStyle = C.inkSoft;
      ctx.font = "400 14px Sarabun";
      const dateStr = new Date().toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" });
      ctx.fillText(dateStr, 108, 88);

      let y = 130;

      // price board card
      const priceRows = [
        ["ทองคำแท่ง 96.5%", toDisplay(market.barBuy), toDisplay(market.barSell)],
        ["ทองรูปพรรณ 96.5%", toDisplay(market.jewelryBuy), toDisplay(market.jewelrySell)],
      ];
      const boardH = 40 + priceRows.length * rowH;
      ctx.strokeStyle = C.goldWash;
      ctx.lineWidth = 1;
      rrPath(ctx, 40, y, w - 80, boardH, 12);
      ctx.fillStyle = C.card;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = C.ink;
      ctx.font = "700 15px 'Noto Serif Thai'";
      ctx.fillText("กระดานราคา (บาทละ)", 60, y + 28);

      priceRows.forEach(([label, buy, sell], i) => {
        const ry = y + 48 + i * rowH;
        ctx.strokeStyle = C.gold;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(72, ry + 8, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.save();
        ctx.translate(72, ry + 8);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = C.red;
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();

        ctx.fillStyle = C.ink;
        ctx.font = "400 15px Sarabun";
        ctx.fillText(label, 98, ry + 13);

        ctx.textAlign = "right";
        ctx.fillStyle = C.inkSoft;
        ctx.font = "400 10px Sarabun";
        ctx.fillText("รับซื้อ", w - 250, ry + 2);
        ctx.fillText("ขายออก", w - 110, ry + 2);
        ctx.fillStyle = C.ink;
        ctx.font = "700 16px 'Space Mono'";
        ctx.fillText(fmt(buy, digits), w - 250, ry + 20);
        ctx.fillStyle = C.gold;
        ctx.fillText(fmt(sell, digits), w - 110, ry + 20);
        ctx.textAlign = "left";
      });

      y += boardH + 36;

      // ornament divider
      ctx.strokeStyle = C.goldLine;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w / 2 - 8, y);
      ctx.moveTo(w / 2 + 8, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      ctx.save();
      ctx.translate(w / 2, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = C.gold;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();

      y += 34;

      // summary
      const summary = [
        ["น้ำหนักรวม", `${fmt(stats.totalWeight, 2)} บาท`, C.ink],
        ["ต้นทุนเฉลี่ย/บาท", `${fmt(toDisplay(stats.avgCost), digits)} ${suffix}`, C.ink],
        ["มูลค่าปัจจุบัน", `${fmt(toDisplay(stats.currentValue), digits)} ${suffix}`, C.ink],
        [
          "กำไร/ขาดทุนรวม",
          `${stats.pl >= 0 ? "+" : ""}${fmt(toDisplay(stats.pl), digits)} ${suffix} (${stats.plPct >= 0 ? "+" : ""}${fmt(stats.plPct, 2)}%)`,
          stats.pl >= 0 ? C.profit : C.loss,
        ],
      ];
      const cardW = (w - 80 - 16) / 2;
      summary.forEach(([label, val, color], i) => {
        const cx = 40 + (i % 2) * (cardW + 16);
        const cy = y + Math.floor(i / 2) * 96;
        rrPath(ctx, cx, cy, cardW, 80, 10);
        ctx.fillStyle = C.card;
        ctx.fill();
        ctx.strokeStyle = C.goldWash;
        ctx.stroke();
        ctx.fillStyle = C.inkSoft;
        ctx.font = "400 12px Sarabun";
        ctx.fillText(label, cx + 16, cy + 26);
        ctx.fillStyle = color;
        ctx.font = "700 19px 'Space Mono'";
        ctx.fillText(val, cx + 16, cy + 54);
      });
      y += 96 * Math.ceil(summary.length / 2) + 30;

      // ornament divider
      ctx.strokeStyle = C.goldLine;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w / 2 - 8, y);
      ctx.moveTo(w / 2 + 8, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      ctx.save();
      ctx.translate(w / 2, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = C.gold;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      y += 34;

      // per-entry bars
      ctx.fillStyle = C.ink;
      ctx.font = "700 16px 'Noto Serif Thai'";
      ctx.fillText("กำไร/ขาดทุนรายรายการ", 40, y);
      y += 18;

      const maxAbs = Math.max(1, ...chartData.map((d) => Math.abs(d.pl)));
      const barMaxW = w - 80 - 190;
      chartData.forEach((d) => {
        y += 46;
        ctx.fillStyle = C.inkSoft;
        ctx.font = "400 12px Sarabun";
        ctx.fillText(d.name, 40, y);
        const bw = Math.max(4, (Math.abs(d.pl) / maxAbs) * barMaxW);
        rrPath(ctx, 40, y + 8, bw, 14, 4);
        ctx.fillStyle = d.fill;
        ctx.fill();
        ctx.fillStyle = d.fill;
        ctx.font = "700 13px 'Space Mono'";
        ctx.fillText(`${d.pl >= 0 ? "+" : ""}${fmt(d.pl, digits)} ${suffix}`, 40 + bw + 10, y + 19);
      });

      y += 50;
      ctx.strokeStyle = C.goldWash;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(w - 40, y);
      ctx.stroke();
      y += 26;
      ctx.fillStyle = C.inkSoft;
      ctx.font = "400 11px Sarabun";
      ctx.fillText("ตัวเลขกรอกโดยผู้ใช้เอง ไม่ใช่คำแนะนำการลงทุน · สร้างจากเว็บเช็คราคาทอง", 40, y);

      const dataUrl = canvas.toDataURL("image/png");
      setPreviewUrl(dataUrl);
      return dataUrl;
    } finally {
      setGenerating(false);
    }
  }

  function downloadImage(url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `gold-summary-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleShare() {
    const url = previewUrl || (await generateInfographic());
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "gold-summary.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "สรุปพอร์ตทองคำของฉัน" });
        setShareNote("");
      } else {
        downloadImage(url);
        setShareNote("อุปกรณ์นี้แชร์ไฟล์โดยตรงไม่ได้ ดาวน์โหลดภาพให้แล้ว ส่งต่อผ่านแอปแชทได้เลย");
      }
    } catch (err) {
      downloadImage(url);
      setShareNote("แชร์ไม่สำเร็จ ดาวน์โหลดภาพไว้ให้แล้วแทน");
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ background: C.paper }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@500;600;700&family=Sarabun:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');
        .font-display { font-family: 'Noto Serif Thai', serif; }
        .font-body { font-family: 'Sarabun', sans-serif; }
        .font-mono-led { font-family: 'Space Mono', monospace; font-variant-numeric: tabular-nums; }
      `}</style>

      <div style={{ height: 3, background: C.red }} />

      <header className="max-w-2xl mx-auto px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Seal size={34} />
          <div>
            <h1 className="font-display text-xl font-semibold tracking-wide" style={{ color: C.ink }}>ราคาทองวันนี้</h1>
            <p className="font-body text-[11px]" style={{ color: C.inkSoft }}>กรอกเองได้ · ไม่ใช่ราคาสด</p>
          </div>
          <div className="ml-auto flex gap-3">
            {["THB", "USD"].map((cur) => (
              <button
                key={cur}
                onClick={() => setCurrency(cur)}
                className="font-body text-xs font-semibold pb-0.5"
                style={{
                  color: currency === cur ? C.ink : C.inkSoft,
                  borderBottom: currency === cur ? `2px solid ${C.gold}` : "2px solid transparent",
                }}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* FX / date ticker */}
      <div className="max-w-2xl mx-auto px-5">
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2 mb-1"
          style={{ background: C.goldWash, border: `1px solid ${C.goldLine}` }}
        >
          <span className="font-body text-[11px]" style={{ color: C.inkSoft }}>
            {now.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            {" · "}
            {now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-mono-led text-xs font-bold flex items-center gap-1.5" style={{ color: C.ink }}>
            USD/THB {fmt(exchangeRate, 2)}
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: rateStatus === "live" ? C.profit : C.gold }}
              title={rateStatus === "live" ? "อัตราสด" : "กรอกเอง"}
            />
          </span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-5 pb-16">
        <AdSlot label="พื้นที่โฆษณา" className="w-full h-14 mb-6" />

        {/* Price board */}
        <section className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-display text-sm font-semibold" style={{ color: C.ink }}>กระดานราคา (บาทละ)</span>
            <div className="flex items-center gap-2">
              {priceChangePct !== null && (
                <span
                  className="font-mono-led text-[11px] font-bold flex items-center gap-0.5"
                  style={{ color: priceChangePct >= 0 ? C.profit : C.loss }}
                  title={`เทียบกับที่บันทึกไว้ล่าสุด (${prevSnapshot.date})`}
                >
                  {priceChangePct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {priceChangePct >= 0 ? "+" : ""}{fmt(priceChangePct, 2)}%
                </span>
              )}
              <RefreshCw size={13} style={{ color: C.inkSoft }} />
            </div>
          </div>
          <PriceRow label="ทองคำแท่ง 96.5%" buy={toDisplay(market.barBuy)} sell={toDisplay(market.barSell)} digits={digits} />
          <PriceRow label="ทองรูปพรรณ 96.5%" buy={toDisplay(market.jewelryBuy)} sell={toDisplay(market.jewelrySell)} digits={digits} />
          <PriceRow label="ราคาต่อออนซ์ (คำนวณ)" buy={toDisplay(market.barBuy) / BAHT_TO_OZ / (currency === "THB" ? 1 : 1)} sell={toDisplay(market.barSell) / BAHT_TO_OZ} digits={2} />

          <details className="mt-3">
            <summary className="font-body text-xs cursor-pointer" style={{ color: C.gold }}>แก้ไขราคาตลาด / อัตราแลกเปลี่ยน</summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[["barBuy", "ทองแท่ง รับซื้อ"], ["barSell", "ทองแท่ง ขายออก"], ["jewelryBuy", "รูปพรรณ รับซื้อ"], ["jewelrySell", "รูปพรรณ ขายออก"]].map(([key, lbl]) => (
                <label key={key} className="font-body text-[11px]" style={{ color: C.inkSoft }}>
                  {lbl}
                  <input
                    type="number"
                    value={market[key]}
                    onChange={(e) => setMarket((m) => ({ ...m, [key]: Number(e.target.value) }))}
                    className="w-full mt-0.5 rounded px-2 py-1 font-mono-led text-sm"
                    style={{ background: C.paper, color: C.ink, border: `1px solid ${C.goldWash}` }}
                  />
                </label>
              ))}
              <label className="font-body text-[11px] col-span-2" style={{ color: C.inkSoft }}>
                อัตราแลกเปลี่ยน (บาท/USD)
                <input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                  className="w-full mt-0.5 rounded px-2 py-1 font-mono-led text-sm"
                  style={{ background: C.paper, color: C.ink, border: `1px solid ${C.goldWash}` }}
                />
              </label>
            </div>
          </details>
        </section>

        {/* History */}
        <section className="mt-3 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-sm font-semibold flex items-center gap-1.5" style={{ color: C.ink }}>
              <Calendar size={14} style={{ color: C.gold }} /> ราคาย้อนหลัง
            </span>
            <button
              onClick={saveTodaySnapshot}
              className="flex items-center gap-1 font-body text-[11px] font-semibold px-2.5 py-1.5 rounded-full"
              style={{ background: C.ink, color: C.paper }}
            >
              <Save size={12} /> บันทึกราคาวันนี้
            </button>
          </div>
          <p className="font-body text-[11px] mb-2" style={{ color: C.inkSoft }}>
            บันทึกไว้เฉพาะราคาที่คุณกดบันทึกเองจากเว็บนี้ ไม่ใช่ฐานข้อมูลย้อนหลังของสมาคมค้าทองคำ
          </p>

          {historyDates.length > 0 ? (
            <select
              value={selectedHistoryDate}
              onChange={(e) => loadHistorySnapshot(e.target.value)}
              className="w-full font-body text-xs rounded px-2 py-1.5"
              style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
            >
              <option value="">— เลือกวันที่เคยบันทึก —</option>
              {historyDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          ) : (
            <p className="font-body text-xs" style={{ color: C.inkSoft }}>ยังไม่มีข้อมูลย้อนหลัง กด "บันทึกราคาวันนี้" เพื่อเริ่มเก็บสถิติ</p>
          )}

          {historySnapshot && (
            <div className="mt-3 rounded-lg p-3" style={{ background: C.goldWash }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs font-semibold" style={{ color: C.ink }}>{historySnapshot.date}</span>
                <button onClick={applyHistoryAsMarket} className="font-body text-[11px] font-semibold underline" style={{ color: C.red }}>
                  ใช้เป็นราคาปัจจุบัน
                </button>
              </div>
              <div className="grid grid-cols-2 gap-y-1 font-mono-led text-[11px]" style={{ color: C.ink }}>
                <span>ทองแท่ง รับซื้อ: {fmt(historySnapshot.market.barBuy)}</span>
                <span>ทองแท่ง ขายออก: {fmt(historySnapshot.market.barSell)}</span>
                <span>รูปพรรณ รับซื้อ: {fmt(historySnapshot.market.jewelryBuy)}</span>
                <span>รูปพรรณ ขายออก: {fmt(historySnapshot.market.jewelrySell)}</span>
                <span className="col-span-2">USD/THB: {fmt(historySnapshot.exchangeRate, 2)}</span>
              </div>
            </div>
          )}
          {historyNote && <p className="font-body text-[11px] mt-2" style={{ color: C.gold }}>{historyNote}</p>}
        </section>

        {/* Price alert */}
        <section className="mt-3 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
          <span className="font-display text-sm font-semibold flex items-center gap-1.5 mb-2" style={{ color: C.ink }}>
            <Bell size={14} style={{ color: C.gold }} /> แจ้งเตือนราคา (ทองแท่งขายออก)
          </span>
          <div className="flex gap-2">
            <select
              value={alertDirection}
              onChange={(e) => setAlertDirection(e.target.value)}
              className="font-body text-xs rounded px-2 py-1.5"
              style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
            >
              <option value="above">ขึ้นถึง ≥</option>
              <option value="below">ลงถึง ≤</option>
            </select>
            <input
              type="number"
              placeholder="ราคาเป้าหมาย (฿)"
              value={alertTarget}
              onChange={(e) => setAlertTarget(e.target.value)}
              className="flex-1 rounded px-2 py-1.5 font-mono-led text-sm"
              style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
            />
            <button
              onClick={armAlert}
              disabled={alertArmed}
              className="font-body text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: alertArmed ? C.goldWash : C.ink, color: alertArmed ? C.inkSoft : C.paper }}
            >
              {alertArmed ? "กำลังรอ..." : "ตั้งแจ้งเตือน"}
            </button>
          </div>
          {alertNote && <p className="font-body text-[11px] mt-2" style={{ color: C.gold }}>{alertNote}</p>}
          <p className="font-body text-[10px] mt-2" style={{ color: C.inkSoft }}>
            แจ้งเตือนแบบนี้ทำงานเฉพาะตอนเปิดหน้านี้ค้างไว้เท่านั้น ถ้าต้องการแจ้งเตือนแม้ปิดแอป ต้องมี push notification server (backend) เพิ่ม
          </p>
        </section>

        <Ornament className="my-6" />

        {/* Portfolio */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold" style={{ color: C.ink }}>รายการซื้อทองของฉัน</h2>
            <button
              onClick={addEntry}
              className="flex items-center gap-1 font-body text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: C.ink, color: C.paper }}
            >
              <Plus size={13} /> เพิ่มรายการ
            </button>
          </div>

          <div className="space-y-2">
            {entries.map((e) => {
              const w = weightInBaht(e);
              const p = Number(e.price) || 0;
              const fee = Number(e.makingCharge) || 0;
              const pl = w * (currentPrice - p) - fee;
              const isProfit = pl >= 0;
              return (
                <div key={e.id} className="rounded-lg p-3" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <input
                      value={e.label}
                      onChange={(ev) => updateEntry(e.id, { label: ev.target.value })}
                      className="font-body text-sm font-medium bg-transparent outline-none w-2/3"
                      style={{ color: C.ink }}
                    />
                    <button onClick={() => removeEntry(e.id)} aria-label="ลบรายการ">
                      <Trash2 size={15} style={{ color: C.inkSoft }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={e.type}
                      onChange={(ev) => updateEntry(e.id, { type: ev.target.value })}
                      className="font-body text-xs rounded px-2 py-1.5"
                      style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
                    >
                      <option value="bar">ทองแท่ง</option>
                      <option value="jewelry">รูปพรรณ</option>
                    </select>
                    <div className="flex gap-1">
                      <label className="text-[10px] font-body flex-1" style={{ color: C.inkSoft }}>
                        น้ำหนัก
                        <input
                          type="number" step="0.01" value={e.weight}
                          onChange={(ev) => updateEntry(e.id, { weight: ev.target.value })}
                          className="w-full mt-0.5 rounded px-2 py-1 font-mono-led text-sm"
                          style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
                        />
                      </label>
                      <select
                        value={e.unit || "baht"}
                        onChange={(ev) => updateEntry(e.id, { unit: ev.target.value })}
                        className="font-body text-[10px] rounded px-1 mt-3.5"
                        style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
                      >
                        <option value="baht">บาท</option>
                        <option value="salung">สลึง</option>
                      </select>
                    </div>
                    <label className="text-[10px] font-body" style={{ color: C.inkSoft }}>
                      ราคา/บาท (฿)
                      <input
                        type="number" value={e.price}
                        onChange={(ev) => updateEntry(e.id, { price: ev.target.value })}
                        className="w-full mt-0.5 rounded px-2 py-1 font-mono-led text-sm"
                        style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
                      />
                    </label>
                    <label className="text-[10px] font-body" style={{ color: C.inkSoft }}>
                      ค่ากำเหน็จ (฿)
                      <input
                        type="number" value={e.makingCharge || 0}
                        onChange={(ev) => updateEntry(e.id, { makingCharge: ev.target.value })}
                        className="w-full mt-0.5 rounded px-2 py-1 font-mono-led text-sm"
                        style={{ border: `1px solid ${C.goldWash}`, color: C.ink }}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <span className="font-mono-led text-xs font-bold flex items-center gap-1" style={{ color: isProfit ? C.profit : C.loss }}>
                      {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isProfit ? "+" : ""}{fmt(toDisplay(pl), digits)} {suffix}
                    </span>
                  </div>
                </div>
              );
            })}
            {entries.length === 0 && (
              <p className="font-body text-sm text-center py-6" style={{ color: C.inkSoft }}>ยังไม่มีรายการ กด "เพิ่มรายการ" เพื่อเริ่ม</p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Info size={13} style={{ color: C.gold }} />
            <label className="font-body text-xs" style={{ color: C.inkSoft }}>
              คำนวณมูลค่าปัจจุบันจาก:{" "}
              <select
                value={valuationBasis}
                onChange={(e) => setValuationBasis(e.target.value)}
                className="font-body text-xs rounded px-1.5 py-0.5"
                style={{ border: `1px solid ${C.goldWash}` }}
              >
                <option value="barBuy">ทองแท่ง รับซื้อ</option>
                <option value="barSell">ทองแท่ง ขายออก</option>
                <option value="jewelryBuy">รูปพรรณ รับซื้อ</option>
                <option value="jewelrySell">รูปพรรณ ขายออก</option>
              </select>
            </label>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 mt-6">
          <SummaryCard label="น้ำหนักรวม" value={`${fmt(stats.totalWeight, 2)} บาท`} />
          <SummaryCard label="ต้นทุนรวม" value={`${fmt(toDisplay(stats.totalCost), digits)} ${suffix}`} />
          <SummaryCard label="ต้นทุนเฉลี่ย/บาท" value={`${fmt(toDisplay(stats.avgCost), digits)} ${suffix}`} />
          <SummaryCard label="มูลค่าปัจจุบัน" value={`${fmt(toDisplay(stats.currentValue), digits)} ${suffix}`} />
          <SummaryCard
            label="กำไร/ขาดทุนรวม"
            value={`${stats.pl >= 0 ? "+" : ""}${fmt(toDisplay(stats.pl), digits)} ${suffix}`}
            accent={stats.pl >= 0 ? C.profit : C.loss}
            className="col-span-2"
            sub={`${stats.plPct >= 0 ? "+" : ""}${fmt(stats.plPct, 2)}%`}
          />
        </section>

        {/* Share / export */}
        <section className="mt-5 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
          <h2 className="font-display text-sm font-semibold mb-1" style={{ color: C.ink }}>แชร์ผลลัพธ์</h2>
          <p className="font-body text-[11px] mb-3" style={{ color: C.inkSoft }}>
            สร้างเป็นภาพสรุป (infographic) เก็บไว้ในเครื่องหรือส่งต่อให้เพื่อนดูได้
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => downloadImage(previewUrl || (await generateInfographic()))}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-1.5 font-body text-xs font-semibold px-3 py-2.5 rounded-full"
              style={{ background: C.ink, color: C.paper, opacity: generating ? 0.6 : 1 }}
            >
              <Download size={14} /> {generating ? "กำลังสร้างภาพ..." : "บันทึกภาพ"}
            </button>
            <button
              onClick={handleShare}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-1.5 font-body text-xs font-semibold px-3 py-2.5 rounded-full"
              style={{ background: C.card, color: C.ink, border: `1.5px solid ${C.gold}`, opacity: generating ? 0.6 : 1 }}
            >
              <Share2 size={14} /> แชร์ให้เพื่อน
            </button>
          </div>
          {shareNote && (
            <p className="font-body text-[11px] mt-2" style={{ color: C.gold }}>{shareNote}</p>
          )}

          {previewUrl && (
            <div className="mt-3 relative">
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute top-2 right-2 rounded-full p-1"
                style={{ background: C.ink }}
                aria-label="ปิดตัวอย่าง"
              >
                <X size={12} color={C.paper} />
              </button>
              <img src={previewUrl} alt="ตัวอย่างภาพสรุป" className="w-full rounded-lg" style={{ border: `1px solid ${C.goldWash}` }} />
            </div>
          )}
        </section>

        <Ornament className="my-6" />

        <AdSlot label="พื้นที่โฆษณา" className="w-full h-20 mb-6" />

        <section>
          <h2 className="font-display text-base font-semibold mb-2" style={{ color: C.ink }}>กำไร/ขาดทุนรายรายการ</h2>
          <div className="rounded-xl p-3" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.goldWash} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Sarabun", fill: C.inkSoft }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Space Mono", fill: C.inkSoft }} />
                <Tooltip formatter={(v) => [`${fmt(v, digits)} ${suffix}`, "กำไร/ขาดทุน"]} contentStyle={{ fontFamily: "Sarabun", fontSize: 12 }} />
                <ReferenceLine y={0} stroke={C.ink} />
                <Bar dataKey="pl" radius={[4, 4, 4, 4]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* SEO / educational content */}
        <section className="mt-8">
          <span className="font-display text-sm font-semibold flex items-center gap-1.5 mb-2" style={{ color: C.ink }}>
            <BookOpen size={14} style={{ color: C.gold }} /> ความรู้เรื่องทอง
          </span>
          <details className="rounded-lg p-3 mb-2" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
            <summary className="font-body text-xs font-semibold cursor-pointer" style={{ color: C.ink }}>
              ทองคำแท่ง กับ ทองรูปพรรณ ต่างกันอย่างไร
            </summary>
            <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: C.inkSoft }}>
              ทองคำแท่งซื้อ-ขายคืนที่ราคาตลาดล้วนๆ ไม่มีค่ากำเหน็จ เหมาะกับการเก็บเป็นสินทรัพย์ ส่วนทองรูปพรรณมีค่าแรงขึ้นรูป (ค่ากำเหน็จ) บวกเพิ่มตอนซื้อ และมักหักค่ากำเหน็จคืนบางส่วนตอนขายคืน ทำให้ต้นทุนที่แท้จริงสูงกว่าราคาทองในกระดานเสมอ
            </p>
          </details>
          <details className="rounded-lg p-3 mb-2" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
            <summary className="font-body text-xs font-semibold cursor-pointer" style={{ color: C.ink }}>
              ขายทองวันนี้ ได้เงินสุทธิเท่าไหร่
            </summary>
            <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: C.inkSoft }}>
              เงินที่ได้จริง = น้ำหนักทอง × ราคารับซื้อ ณ วันนั้น ลบด้วยค่ากำเหน็จที่ร้านอาจหักเพิ่มสำหรับทองรูปพรรณ (ทองแท่งปกติไม่หัก) เครื่องคำนวณด้านบนนี้รวมค่ากำเหน็จที่กรอกไว้ในต้นทุนให้แล้ว ตัวเลขกำไร/ขาดทุนจึงใกล้เคียงความจริงมากกว่าคิดจากราคาทองอย่างเดียว
            </p>
          </details>
          <details className="rounded-lg p-3" style={{ background: C.card, border: `1px solid ${C.goldWash}` }}>
            <summary className="font-body text-xs font-semibold cursor-pointer" style={{ color: C.ink }}>
              1 บาททอง เท่ากับกี่กรัม กี่สลึง
            </summary>
            <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: C.inkSoft }}>
              1 บาททอง = 4 สลึง = 15.244 กรัม ตามมาตรฐานหน่วยชั่งทองคำของไทย
            </p>
          </details>
        </section>

        <AdSlot label="พื้นที่โฆษณา" className="w-full h-16 mt-8" />
      </main>
    </div>
  );
}
