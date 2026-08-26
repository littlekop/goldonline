"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Share2,
  X,
  Bell,
  Cloud,
  CloudOff,
  Sun,
  Moon,
} from "lucide-react";
import { isGoogleSyncConfigured, requestDriveAccessToken, revokeDriveAccessToken } from "@/lib/googleAuth";
import { readSyncedData, writeSyncedData } from "@/lib/driveSync";
import TradingViewGoldWidget from "@/components/TradingViewGoldWidget";
import ShareButtons from "@/components/ShareButtons";
import AffiliateBanner from "@/components/AffiliateBanner";
import { SITE_URL } from "@/lib/site";
import type { ArticleMeta } from "@/lib/articles";

const GRAM_PER_BAHT = 15.244;
const GRAM_PER_OZ = 31.1034768;
const BAHT_TO_OZ = GRAM_PER_BAHT / GRAM_PER_OZ;

const C = {
  paper: "var(--paper)",
  card: "var(--card)",
  cardSoft: "var(--card-soft)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  inkFaint: "var(--ink-faint)",
  line: "var(--line)",
  red: "var(--red)",
  gold: "var(--gold)",
  profit: "var(--profit)",
  loss: "var(--loss)",
};

// canvas 2D can't resolve CSS custom properties, so the shareable infographic
// needs its own resolved hex palette per theme
const CANVAS_PALETTE = {
  light: {
    paper: "#FAF8F3",
    ink: "#14120F",
    inkSoft: "#4B473F",
    inkFaint: "#7A756A",
    line: "#E9E4D8",
    red: "#A6362B",
    profit: "#2F5D3A",
    loss: "#6B675F",
  },
  dark: {
    paper: "#17140F",
    ink: "#F3EEE3",
    inkSoft: "#C7C0AE",
    inkFaint: "#8C8570",
    line: "#3A3327",
    red: "#E2695A",
    profit: "#6FBE85",
    loss: "#A39C8A",
  },
};

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.line}`,
  borderRadius: 20,
  boxShadow: "0 1px 2px rgba(20,18,15,0.03), 0 20px 36px -28px rgba(20,18,15,0.20)",
};

const inputClass =
  "w-full rounded-xl px-3 py-2.5 font-mono-led outline-none transition focus:ring-2 focus:ring-[#9C7A1F]/30";
const inputStyle: React.CSSProperties = { background: C.cardSoft, color: C.ink };

const pillPrimary =
  "flex items-center justify-center gap-1.5 rounded-full font-body text-sm font-semibold transition hover:brightness-105 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
const pillGhost =
  "flex items-center justify-center gap-1.5 rounded-full font-body text-sm font-semibold transition hover:bg-black/[0.03] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
const accentButtonStyle: React.CSSProperties = {
  background: "var(--accent-gradient)",
  color: C.ink,
  boxShadow: "0 6px 16px -6px rgba(184,125,10,0.55)",
};

type Market = {
  barBuy: number;
  barSell: number;
  jewelryBuy: number;
  jewelrySell: number;
};

type ValuationBasis = keyof Market;

type Entry = {
  id: number;
  label: string;
  type: "bar" | "jewelry";
  weight: number | string;
  unit: "baht" | "salung";
  price: number | string;
  makingCharge: number | string;
};

type Locale = "th" | "en";
type Theme = "light" | "dark";

const LIVE_REFRESH_MS = 5 * 60 * 1000;
const PORTFOLIO_KEY = "gold-portfolio";
const THEME_KEY = "gold-theme";
const LOCALE_KEY = "gold-locale";

const fmt = (n: number, digits = 0) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// live thousands-separator formatting for plain-text number inputs (native
// <input type="number"> can't show commas) — keeps the raw numeric string in
// state and only formats what's displayed
function formatNumberInput(raw: number | string): string {
  const s = String(raw ?? "");
  if (s === "") return "";
  const negative = s.trim().startsWith("-");
  const [intPart, ...rest] = s.replace(/-/g, "").split(".");
  const groupedInt = intPart === "" ? "" : Number(intPart || 0).toLocaleString("en-US");
  const decPart = rest.length ? "." + rest.join("") : "";
  return (negative ? "-" : "") + groupedInt + decPart;
}

function unformatNumberInput(display: string): string {
  return display.replace(/,/g, "");
}

const translations = {
  th: {
    eyebrow: "ทองคำออนไลน์ · ราคาวันนี้",
    title: "ราคาทองคำวันนี้",
    themeToLight: "สลับเป็นโหมดสว่าง",
    themeToDark: "สลับเป็นโหมดมืด",
    langToEn: "เปลี่ยนเป็นภาษาอังกฤษ",
    langToTh: "เปลี่ยนเป็นภาษาไทย",
    priceBoardHeading: "กระดานราคา",
    refreshAria: "รีเฟรชราคา",
    liveLabel: "อัตราสด",
    manualLabel: "กรอกเอง",
    comparedTo: (d: string) => `เทียบกับที่บันทึกไว้ล่าสุด (${d})`,
    priceLive: "ราคาจริงจากสมาคมค้าทองคำแห่งประเทศไทย",
    priceEstimatedFallback: "ดึงราคาจากสมาคมไม่สำเร็จ — ใช้ราคาประมาณการจากราคาทองโลกแทน",
    priceLoading: "กำลังดึงราคา...",
    priceFailed: "ดึงราคาสดไม่สำเร็จ ลองกดรีเฟรชอีกครั้ง",
    updatedAt: (t: string) => ` · อัปเดต ${t}`,
    updatedAgoJustNow: "เพิ่งอัปเดต",
    updatedAgoMinutes: (n: number) => `อัปเดตเมื่อ ${n} นาทีที่แล้ว`,
    seqLabel: (n: number) => `ประกาศครั้งที่ ${n} วันนี้`,
    todayChangeUp: (n: string) => `วันนี้ ▲ ${n}`,
    todayChangeDown: (n: string) => `วันนี้ ▼ ${n}`,
    todayChangeFlat: "วันนี้ราคาคงที่",
    sharePriceCard: "แชร์ราคานี้",
    savePriceCard: "บันทึกรูปภาพราคาลงเครื่อง",
    widgetCta: "ฝังราคาทองในเว็บคุณ (ฟรี) →",
    priceCardTitle: "ราคาทองคำวันนี้",
    priceCardCredit: "ราคาตามประกาศสมาคมค้าทองคำแห่งประเทศไทย",
    barLabel: "ทองคำแท่ง 96.5%",
    jewelryLabel: "ทองรูปพรรณ 96.5%",
    ozLabel: "ราคาต่อออนซ์ (คำนวณ)",
    buyLabel: "รับซื้อ",
    sellLabel: "ขายออก",
    worldChartHeading: "ราคาทองคำโลก (Gold Spot) เรียลไทม์",
    worldChartCredit: "ข้อมูลจาก TradingView",
    historyHeading: "ราคาย้อนหลัง",
    saveToday: "บันทึกราคาวันนี้",
    historyNoteInfo: "บันทึกไว้เฉพาะราคาที่คุณกดบันทึกเองจากเว็บนี้ ไม่ใช่ฐานข้อมูลย้อนหลังของสมาคมค้าทองคำ",
    historySelectPlaceholder: "— เลือกวันที่เคยบันทึก —",
    historyEmpty: 'ยังไม่มีข้อมูลย้อนหลัง กด "บันทึกราคาวันนี้" เพื่อเริ่มเก็บสถิติ',
    useAsCurrentPrice: "ใช้เป็นราคาปัจจุบัน",
    savedToday: "บันทึกราคาวันนี้แล้ว",
    saveFailed: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง",
    loadHistoryFailed: "ดึงข้อมูลวันที่เลือกไม่สำเร็จ",
    appliedHistory: (date: string) => `ใช้ราคาของวันที่ ${date} เป็นราคาตลาดปัจจุบันแล้ว (ไม่ใช่ราคาสด)`,
    alertHeading: "แจ้งเตือนราคา",
    alertAbove: "ขึ้นถึง ≥",
    alertBelow: "ลงถึง ≤",
    alertPlaceholder: "ราคาเป้าหมาย (฿)",
    alertArm: "ตั้งแจ้งเตือน",
    alertArming: "กำลังรอ...",
    alertNeedTarget: "กรุณากรอกราคาเป้าหมายก่อน",
    alertNeedPermission: "ต้องอนุญาตการแจ้งเตือนของเบราว์เซอร์ก่อนถึงจะตั้งได้",
    alertUnsupported: "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน",
    alertArmed: "ตั้งแจ้งเตือนแล้ว ต้องเปิดหน้านี้ทิ้งไว้ถึงจะแจ้งได้",
    alertHit: (p: string) => `ถึงเป้าหมายแล้ว! ราคาปัจจุบัน ${p} บาท`,
    alertNotifyTitle: "ราคาทองถึงเป้าหมายแล้ว",
    alertNotifyBody: (sell: string, dir: string, target: string) =>
      `ทองแท่งขายออก ${sell} บาท (เป้าหมาย ${dir} ${target})`,
    alertNote: "แจ้งเตือนแบบนี้ทำงานเฉพาะตอนเปิดหน้านี้ค้างไว้เท่านั้น",
    portfolioHeading: "รายการซื้อทองของฉัน",
    addEntry: "เพิ่มรายการ",
    removeEntryAria: "ลบรายการ",
    typeBar: "ทองแท่ง",
    typeJewelry: "รูปพรรณ",
    weightLabel: "น้ำหนัก",
    unitBaht: "บาท",
    unitSalung: "สลึง",
    priceLabel: "ราคา/บาท (฿)",
    makingChargeLabel: "ค่ากำเหน็จ (฿)",
    entryEmpty: 'ยังไม่มีรายการ กด "เพิ่มรายการ" เพื่อเริ่ม',
    valuationBasisLabel: "คำนวณมูลค่าปัจจุบันจาก:",
    basisBarBuy: "ทองแท่ง รับซื้อ",
    basisBarSell: "ทองแท่ง ขายออก",
    basisJewelryBuy: "รูปพรรณ รับซื้อ",
    basisJewelrySell: "รูปพรรณ ขายออก",
    summaryWeight: "น้ำหนักรวม",
    summaryCost: "ต้นทุนรวม",
    summaryAvgCost: "ต้นทุนเฉลี่ย/บาท",
    summaryValue: "มูลค่าปัจจุบัน",
    summaryPl: "กำไร/ขาดทุนรวม",
    bahtUnit: "บาท",
    shareHeading: "แชร์ผลลัพธ์",
    shareDesc: "สร้างเป็นภาพสรุป (infographic) เก็บไว้ในเครื่องหรือส่งต่อให้เพื่อนดูได้",
    saveImage: "บันทึกภาพ",
    generatingImage: "กำลังสร้างภาพ...",
    shareToFriend: "แชร์ให้เพื่อน",
    shareUnsupported: "อุปกรณ์นี้แชร์ไฟล์โดยตรงไม่ได้ ดาวน์โหลดภาพให้แล้ว ส่งต่อผ่านแอปแชทได้เลย",
    shareFailed: "แชร์ไม่สำเร็จ ดาวน์โหลดภาพไว้ให้แล้วแทน",
    closePreviewAria: "ปิดตัวอย่าง",
    previewAlt: "ตัวอย่างภาพสรุป",
    chartHeading: "กำไร/ขาดทุนรายรายการ",
    chartTooltipLabel: "กำไร/ขาดทุน",
    faqHeading: "ความรู้เรื่องทอง",
    faq1Q: "ทองคำแท่ง กับ ทองรูปพรรณ ต่างกันอย่างไร",
    faq1A: "ทองคำแท่งซื้อ-ขายคืนที่ราคาตลาดล้วนๆ ไม่มีค่ากำเหน็จ เหมาะกับการเก็บเป็นสินทรัพย์ ส่วนทองรูปพรรณมีค่าแรงขึ้นรูป (ค่ากำเหน็จ) บวกเพิ่มตอนซื้อ และมักหักค่ากำเหน็จคืนบางส่วนตอนขายคืน ทำให้ต้นทุนที่แท้จริงสูงกว่าราคาทองในกระดานเสมอ",
    faq2Q: "ขายทองวันนี้ ได้เงินสุทธิเท่าไหร่",
    faq2A: "เงินที่ได้จริง = น้ำหนักทอง × ราคารับซื้อ ณ วันนั้น ลบด้วยค่ากำเหน็จที่ร้านอาจหักเพิ่มสำหรับทองรูปพรรณ (ทองแท่งปกติไม่หัก) เครื่องคำนวณด้านบนนี้รวมค่ากำเหน็จที่กรอกไว้ในต้นทุนให้แล้ว ตัวเลขกำไร/ขาดทุนจึงใกล้เคียงความจริงมากกว่าคิดจากราคาทองอย่างเดียว",
    faq3Q: "1 บาททอง เท่ากับกี่กรัม กี่สลึง",
    faq3A: "1 บาททอง = 4 สลึง = 15.244 กรัม ตามมาตรฐานหน่วยชั่งทองคำของไทย",
    articlesPrompt: "อยากอ่านข่าวและบทความเกี่ยวกับสถานการณ์ทองคำโลก?",
    articlesCta: "ดูบทความ →",
    newsHeading: "ข่าวและบทความล่าสุด",
    newsViewAll: "ดูทั้งหมด →",
    adSlot: "พื้นที่โฆษณา",
    syncLocalOnly: "ข้อมูลเก็บในเครื่องนี้เท่านั้น",
    syncSigningIn: "กำลังเข้าสู่ระบบ...",
    syncSyncing: "กำลังซิงก์...",
    syncSynced: "ซิงก์กับ Google Drive แล้ว",
    syncFailed: "ซิงก์ไม่สำเร็จ",
    syncSignOut: "ออกจากระบบ",
    syncSignIn: "เข้าสู่ระบบด้วย Google เพื่อ sync ข้ามอุปกรณ์",
    syncDriveFailed: "ซิงก์ไป Google Drive ไม่สำเร็จ ข้อมูลยังอยู่ในเครื่องนี้ตามปกติ",
    syncPulledFromDrive: "ดึงข้อมูลจาก Google Drive มาใช้แล้ว",
    syncNoDriveData: "ยังไม่มีข้อมูลบน Drive — จะเริ่มบันทึกจากข้อมูลในเครื่องนี้",
    syncSignInFailedGeneric: "เข้าสู่ระบบไม่สำเร็จ",
    entryLabelDefault: (n: number) => `ซื้อครั้งที่ ${n}`,
    infographicTitle: "สรุปพอร์ตทองคำของฉัน",
    infographicBoardTitle: "กระดานราคา (บาทละ)",
    infographicWeightTotal: "น้ำหนักรวม",
    infographicAvgCost: "ต้นทุนเฉลี่ย/บาท",
    infographicCurrentValue: "มูลค่าปัจจุบัน",
    infographicPl: "กำไร/ขาดทุนรวม",
    infographicChartTitle: "กำไร/ขาดทุนรายรายการ",
    infographicCreditLive:
      "ราคาทองอ้างอิงจากสมาคมค้าทองคำแห่งประเทศไทย ไม่ใช่คำแนะนำการลงทุน · สร้างจากเว็บเช็คราคาทอง",
    infographicCreditEstimate: "ราคาทองเป็นค่าประมาณการ ไม่ใช่คำแนะนำการลงทุน · สร้างจากเว็บเช็คราคาทอง",
    dateLocale: "th-TH",
  },
  en: {
    eyebrow: "Gold Online · Today's price",
    title: "Gold Price Today",
    themeToLight: "Switch to light mode",
    themeToDark: "Switch to dark mode",
    langToEn: "Switch to English",
    langToTh: "Switch to Thai",
    priceBoardHeading: "Price board",
    refreshAria: "Refresh price",
    liveLabel: "Live rate",
    manualLabel: "Manual",
    comparedTo: (d: string) => `vs. last saved (${d})`,
    priceLive: "Real price from the Gold Traders Association of Thailand",
    priceEstimatedFallback: "Couldn't reach the association's feed — using a world-spot estimate instead",
    priceLoading: "Fetching price...",
    priceFailed: "Live fetch failed, try refreshing",
    updatedAt: (t: string) => ` · updated ${t}`,
    updatedAgoJustNow: "Just updated",
    updatedAgoMinutes: (n: number) => `Updated ${n} min ago`,
    seqLabel: (n: number) => `Update #${n} today`,
    todayChangeUp: (n: string) => `Today ▲ ${n}`,
    todayChangeDown: (n: string) => `Today ▼ ${n}`,
    todayChangeFlat: "No change today",
    sharePriceCard: "Share this price",
    savePriceCard: "Save price image to device",
    widgetCta: "Embed this on your site (free) →",
    priceCardTitle: "Gold Price Today",
    priceCardCredit: "Per the Gold Traders Association of Thailand",
    barLabel: "Gold bar 96.5%",
    jewelryLabel: "Gold jewelry 96.5%",
    ozLabel: "Price per ounce (calculated)",
    buyLabel: "Buy",
    sellLabel: "Sell",
    worldChartHeading: "World Gold Spot — Live",
    worldChartCredit: "Data by TradingView",
    historyHeading: "Price history",
    saveToday: "Save today's price",
    historyNoteInfo: "Only stores prices you've manually saved from this site — not the association's own historical database.",
    historySelectPlaceholder: "— Select a saved date —",
    historyEmpty: 'No history yet. Tap "Save today\'s price" to start.',
    useAsCurrentPrice: "Use as current price",
    savedToday: "Saved today's price.",
    saveFailed: "Save failed, please try again.",
    loadHistoryFailed: "Couldn't load that date.",
    appliedHistory: (date: string) => `Applied prices from ${date} (not live).`,
    alertHeading: "Price alert",
    alertAbove: "Rises to ≥",
    alertBelow: "Falls to ≤",
    alertPlaceholder: "Target price (฿)",
    alertArm: "Set alert",
    alertArming: "Waiting...",
    alertNeedTarget: "Enter a target price first.",
    alertNeedPermission: "Browser notification permission is required.",
    alertUnsupported: "This browser doesn't support notifications.",
    alertArmed: "Alert set — keep this tab open to get notified.",
    alertHit: (p: string) => `Target reached! Current price ${p} THB`,
    alertNotifyTitle: "Gold price target reached",
    alertNotifyBody: (sell: string, dir: string, target: string) =>
      `Gold bar sell ${sell} THB (target ${dir} ${target})`,
    alertNote: "This alert only fires while this tab stays open.",
    portfolioHeading: "My gold purchases",
    addEntry: "Add entry",
    removeEntryAria: "Remove entry",
    typeBar: "Bar",
    typeJewelry: "Jewelry",
    weightLabel: "Weight",
    unitBaht: "baht",
    unitSalung: "salung",
    priceLabel: "Price/baht (฿)",
    makingChargeLabel: "Making charge (฿)",
    entryEmpty: 'No entries yet. Tap "Add entry" to start.',
    valuationBasisLabel: "Value current holdings using:",
    basisBarBuy: "Bar buy",
    basisBarSell: "Bar sell",
    basisJewelryBuy: "Jewelry buy",
    basisJewelrySell: "Jewelry sell",
    summaryWeight: "Total weight",
    summaryCost: "Total cost",
    summaryAvgCost: "Avg. cost/baht",
    summaryValue: "Current value",
    summaryPl: "Total P/L",
    bahtUnit: "baht",
    shareHeading: "Share results",
    shareDesc: "Generate a summary image to save or share with friends.",
    saveImage: "Save image",
    generatingImage: "Generating...",
    shareToFriend: "Share",
    shareUnsupported: "This device can't share files directly — image downloaded instead, share it via any chat app.",
    shareFailed: "Share failed — image downloaded instead.",
    closePreviewAria: "Close preview",
    previewAlt: "Summary image preview",
    chartHeading: "Profit/loss per entry",
    chartTooltipLabel: "P/L",
    faqHeading: "Gold basics",
    faq1Q: "Gold bars vs. gold jewelry — what's the difference?",
    faq1A: "Gold bars trade at pure market price with no making charge, making them better for storing value. Jewelry carries a making charge added on purchase, and shops often deduct part of it back on resale — so its real cost always runs above the board price.",
    faq2Q: "How much do I actually get selling gold today?",
    faq2A: "Net proceeds = weight × that day's buy price, minus any making-charge deduction shops apply to jewelry (bars usually aren't deducted). The calculator above already factors in the making charge you entered, so its P/L figure is closer to reality than price alone.",
    faq3Q: "How many grams/salung is 1 baht of gold?",
    faq3A: "1 baht weight = 4 salung = 15.244 grams, per Thailand's traditional gold-weight standard.",
    articlesPrompt: "Want to read news and articles on the world gold market?",
    articlesCta: "Read articles →",
    newsHeading: "Latest news & articles",
    newsViewAll: "View all →",
    adSlot: "Ad space",
    syncLocalOnly: "Data stored on this device only.",
    syncSigningIn: "Signing in...",
    syncSyncing: "Syncing...",
    syncSynced: "Synced with Google Drive.",
    syncFailed: "Sync failed.",
    syncSignOut: "Sign out",
    syncSignIn: "Sign in with Google to sync across devices",
    syncDriveFailed: "Sync to Google Drive failed — your data is still safe on this device.",
    syncPulledFromDrive: "Loaded your data from Google Drive.",
    syncNoDriveData: "No data on Drive yet — will start saving from what's on this device.",
    syncSignInFailedGeneric: "Sign-in failed.",
    entryLabelDefault: (n: number) => `Purchase ${n}`,
    infographicTitle: "My Gold Portfolio Summary",
    infographicBoardTitle: "Price board (per baht)",
    infographicWeightTotal: "Total weight",
    infographicAvgCost: "Avg. cost/baht",
    infographicCurrentValue: "Current value",
    infographicPl: "Total P/L",
    infographicChartTitle: "Profit/loss per entry",
    infographicCreditLive:
      "Gold price from the Gold Traders Association of Thailand. Not investment advice. · Made with the gold price tracker",
    infographicCreditEstimate: "Gold price is an estimate. Not investment advice. · Made with the gold price tracker",
    dateLocale: "en-US",
  },
} as const;

function rrPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`font-body text-[13px] font-semibold uppercase tracking-[0.16em] ${className}`}
      style={{ color: C.inkSoft }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-medium mb-4" style={{ color: C.ink }}>
      {children}
    </h2>
  );
}

// Flashes green/red and pulses briefly whenever `value` changes — mirrors
// the "เด้ง" live-ticker effect on Thai gold-price sites (goldtraders.or.th
// et al.), so users get a visual cue on every price update, not just a
// silent number swap.
function FlashValue({
  value,
  digits = 0,
  className = "",
  baseColor,
}: {
  value: number;
  digits?: number;
  className?: string;
  baseColor: string;
}) {
  const prevRef = useRef(value);
  const [state, setState] = useState<{ dir: "up" | "down" | null; key: number }>({ dir: null, key: 0 });

  useEffect(() => {
    if (prevRef.current !== value) {
      const dir = value > prevRef.current ? "up" : "down";
      prevRef.current = value;
      setState((s) => ({ dir, key: s.key + 1 }));
      const t = setTimeout(() => setState((s) => ({ ...s, dir: null })), 1400);
      return () => clearTimeout(t);
    }
  }, [value]);

  const color = state.dir === "up" ? C.profit : state.dir === "down" ? C.red : baseColor;

  return (
    <span
      key={state.key}
      className={`${className} ${state.dir ? "price-flash" : ""}`}
      style={{ color, transition: "color 0.6s ease" }}
    >
      {fmt(value, digits)}
    </span>
  );
}

function PriceRow({
  label,
  buy,
  sell,
  digits,
  buyLabel,
  sellLabel,
}: {
  label: string;
  buy: number;
  sell: number;
  digits: number;
  buyLabel: string;
  sellLabel: string;
}) {
  return (
    <div className="flex items-baseline gap-6 py-4" style={{ borderTop: `1px solid ${C.line}` }}>
      <span className="font-body text-base flex-1 min-w-0" style={{ color: C.ink }}>
        {label}
      </span>
      <div className="text-right" style={{ minWidth: 84 }}>
        <div className="font-body text-[13px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
          {buyLabel}
        </div>
        <div className="font-mono-led text-lg whitespace-nowrap">
          <FlashValue value={buy} digits={digits} baseColor={C.ink} />
        </div>
      </div>
      <div className="text-right" style={{ minWidth: 84 }}>
        <div className="font-body text-[13px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
          {sellLabel}
        </div>
        <div className="font-mono-led text-lg font-bold whitespace-nowrap">
          <FlashValue value={sell} digits={digits} baseColor={C.red} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
  highlight,
  className = "",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  highlight?: "profit" | "loss";
  className?: string;
}) {
  const isGlowing = highlight === "profit";
  const glowColor = "#0A2F1B";
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: isGlowing ? "var(--profit-gradient)" : C.cardSoft }}
    >
      <div
        className="font-body text-[13px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: isGlowing ? "rgba(10,47,27,0.7)" : C.inkSoft }}
      >
        {label}
      </div>
      <div className="font-mono-led text-2xl mt-1.5" style={{ color: isGlowing ? glowColor : accent || C.ink }}>
        {value}
      </div>
      {sub && (
        <div className="font-body text-sm font-medium mt-0.5" style={{ color: isGlowing ? glowColor : accent }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function GoldTracker({ latestArticles = [] }: { latestArticles?: ArticleMeta[] }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [locale, setLocale] = useState<Locale>("th");
  const tt = translations[locale];

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_KEY) as Theme | null;
      const preferred = savedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setTheme(preferred);
      document.documentElement.dataset.theme = preferred;

      const savedLocale = window.localStorage.getItem(LOCALE_KEY) as Locale | null;
      if (savedLocale) setLocale(savedLocale);
    } catch {
      // ignore, keep defaults
    }
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {}
      return next;
    });
  }

  function toggleLocale() {
    setLocale((prev) => {
      const next = prev === "th" ? "en" : "th";
      try {
        window.localStorage.setItem(LOCALE_KEY, next);
      } catch {}
      return next;
    });
  }

  const [currency, setCurrency] = useState<"THB" | "USD">("THB");
  const [exchangeRate, setExchangeRate] = useState(32.5);
  const [market, setMarket] = useState<Market>({
    barBuy: 70200,
    barSell: 70300,
    jewelryBuy: 68700,
    jewelrySell: 70800,
  });
  const [valuationBasis, setValuationBasis] = useState<ValuationBasis>("barBuy");
  const [entries, setEntries] = useState<Entry[]>([
    { id: 1, label: tt.entryLabelDefault(1), type: "bar", weight: 1, unit: "baht", price: 68500, makingCharge: 0 },
    { id: 2, label: tt.entryLabelDefault(2), type: "bar", weight: 0.5, unit: "baht", price: 69800, makingCharge: 0 },
  ]);
  const nextId = useRef(3);
  const portfolioLoaded = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [generatingCard, setGeneratingCard] = useState(false);
  const [cardShareNote, setCardShareNote] = useState("");

  const [rateStatus, setRateStatus] = useState<"loading" | "live" | "manual">("loading");
  const [priceStatus, setPriceStatus] = useState<"loading" | "live" | "estimated" | "manual">("loading");
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<Date | null>(null);
  const [priceSeq, setPriceSeq] = useState<number | null>(null);
  const [changeToday, setChangeToday] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"signed-out" | "signing-in" | "syncing" | "synced" | "error">(
    "signed-out"
  );
  const [syncNote, setSyncNote] = useState("");
  const googleConfigured = isGoogleSyncConfigured();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateLocale = tt.dateLocale;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // load the locally-saved portfolio once on mount (baseline persistence,
  // independent of whether Google sync is signed in)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PORTFOLIO_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { entries: Entry[]; valuationBasis: ValuationBasis };
        if (Array.isArray(saved.entries) && saved.entries.length) {
          setEntries(saved.entries);
          nextId.current = Math.max(...saved.entries.map((e) => e.id), 0) + 1;
        }
        if (saved.valuationBasis) setValuationBasis(saved.valuationBasis);
      }
    } catch {
      // ignore corrupt local data, keep defaults
    } finally {
      portfolioLoaded.current = true;
    }
  }, []);

  // keep the portfolio persisted locally, and mirror to Drive when signed in
  useEffect(() => {
    if (!portfolioLoaded.current) return;
    try {
      window.localStorage.setItem(PORTFOLIO_KEY, JSON.stringify({ entries, valuationBasis }));
    } catch {
      // storage full/unavailable — the in-memory state still works for this session
    }
    scheduleDriveSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, valuationBasis]);

  function collectLocalHistory(): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    if (typeof window === "undefined") return record;
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("gold-history:")) {
        try {
          record[key.replace("gold-history:", "")] = JSON.parse(window.localStorage.getItem(key) || "null");
        } catch {
          // skip corrupt entry
        }
      }
    }
    return record;
  }

  function scheduleDriveSync() {
    if (!driveToken) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        setSyncStatus("syncing");
        await writeSyncedData(driveToken, {
          entries,
          valuationBasis,
          history: collectLocalHistory(),
          updatedAt: new Date().toISOString(),
        });
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
        setSyncNote(tt.syncDriveFailed);
      }
    }, 1500);
  }

  async function signInWithGoogle() {
    setSyncNote("");
    setSyncStatus("signing-in");
    try {
      const token = await requestDriveAccessToken();
      setDriveToken(token);
      setSyncStatus("syncing");
      const remote = await readSyncedData(token);
      if (remote) {
        if (Array.isArray(remote.entries) && remote.entries.length) {
          setEntries(remote.entries as Entry[]);
          nextId.current = Math.max(...(remote.entries as Entry[]).map((e) => e.id), 0) + 1;
        }
        if (remote.valuationBasis) setValuationBasis(remote.valuationBasis as ValuationBasis);
        setSyncNote(tt.syncPulledFromDrive);
      } else {
        setSyncNote(tt.syncNoDriveData);
      }
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
      setSyncNote(err instanceof Error ? err.message : tt.syncSignInFailedGeneric);
    }
  }

  function signOutOfGoogle() {
    if (driveToken) revokeDriveAccessToken(driveToken);
    setDriveToken(null);
    setSyncStatus("signed-out");
    setSyncNote("");
  }

  async function refreshLivePrices() {
    setRateStatus("loading");
    setPriceStatus("loading");
    try {
      const res = await fetch("/api/live-prices", { cache: "no-store" });
      const data = await res.json();

      if (Number.isFinite(data?.exchangeRate) && data.exchangeRate > 0) {
        setExchangeRate(data.exchangeRate);
        setRateStatus("live");
      } else {
        setRateStatus("manual");
      }

      if (data?.market) {
        setMarket(data.market as Market);
        setPriceStatus(data.source === "gta" ? "live" : "estimated");
        setPriceUpdatedAt(new Date());
        setPriceSeq(Number.isFinite(data?.priceSeq) ? data.priceSeq : null);
        setChangeToday(Number.isFinite(data?.changeToday) ? data.changeToday : null);
      } else {
        setPriceStatus("manual");
      }
    } catch {
      setRateStatus("manual");
      setPriceStatus("manual");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refreshLivePrices();
    })();
    const t = setInterval(() => {
      if (!cancelled) refreshLivePrices();
    }, LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [alertTarget, setAlertTarget] = useState("");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");
  const [alertArmed, setAlertArmed] = useState(false);
  const [alertNote, setAlertNote] = useState("");

  async function armAlert() {
    setAlertNote("");
    if (!alertTarget || Number(alertTarget) <= 0) {
      setAlertNote(tt.alertNeedTarget);
      return;
    }
    if (typeof Notification !== "undefined") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setAlertNote(tt.alertNeedPermission);
          return;
        }
      } catch {
        setAlertNote(tt.alertUnsupported);
        return;
      }
    } else {
      setAlertNote(tt.alertUnsupported);
      return;
    }
    setAlertArmed(true);
    setAlertNote(tt.alertArmed);
  }

  useEffect(() => {
    if (!alertArmed || !alertTarget) return;
    const target = Number(alertTarget);
    const hit = alertDirection === "above" ? market.barSell >= target : market.barSell <= target;
    if (hit) {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(tt.alertNotifyTitle, {
            body: tt.alertNotifyBody(fmt(market.barSell), alertDirection === "above" ? "≥" : "≤", fmt(target)),
          });
        }
      } catch {}
      setAlertArmed(false);
      setAlertNote(tt.alertHit(fmt(market.barSell)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.barSell, alertArmed, alertTarget, alertDirection]);

  const addEntry = () =>
    setEntries((es) => [
      ...es,
      {
        id: nextId.current++,
        label: tt.entryLabelDefault(es.length + 1),
        type: "bar",
        weight: 1,
        unit: "baht",
        price: market.barSell,
        makingCharge: 0,
      },
    ]);
  const removeEntry = (id: number) => setEntries((es) => es.filter((e) => e.id !== id));
  const updateEntry = (id: number, patch: Partial<Entry>) =>
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const weightInBaht = (e: Entry) => {
    const raw = Number(e.weight) || 0;
    return e.unit === "salung" ? raw / 4 : raw;
  };

  const currentPrice = market[valuationBasis];

  const stats = useMemo(() => {
    const totalWeight = entries.reduce((s, e) => s + weightInBaht(e), 0);
    const totalCost = entries.reduce(
      (s, e) => s + weightInBaht(e) * (Number(e.price) || 0) + (Number(e.makingCharge) || 0),
      0
    );
    const avgCost = totalWeight ? totalCost / totalWeight : 0;
    const currentValue = totalWeight * currentPrice;
    const pl = currentValue - totalCost;
    const plPct = totalCost ? (pl / totalCost) * 100 : 0;
    return { totalWeight, totalCost, avgCost, currentValue, pl, plPct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, currentPrice]);

  const toDisplay = (thb: number) => (currency === "THB" ? thb : thb / exchangeRate);
  const suffix = currency === "THB" ? "฿" : "$";
  const digits = currency === "THB" ? 0 : 2;

  const chartData = entries.map((e) => {
    const w = weightInBaht(e);
    const p = Number(e.price) || 0;
    const fee = Number(e.makingCharge) || 0;
    const pl = w * (currentPrice - p) - fee;
    return { name: e.label, pl: toDisplay(pl), fill: pl >= 0 ? "var(--profit)" : "var(--loss)" };
  });

  async function generateInfographic() {
    setGenerating(true);
    setShareNote("");
    const P = CANVAS_PALETTE[theme];
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.load("500 30px 'Noto Serif Thai'");
        await document.fonts.load("400 16px 'IBM Plex Sans Thai'");
        await document.fonts.load("700 16px 'Space Mono'");
        await document.fonts.ready;
      }
      const w = 720;
      const rowH = 58;
      const barsH = Math.max(entries.length, 1) * 46 + 40;
      const h = 1160 + barsH;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = P.paper;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(w, 4);
      ctx.stroke();

      ctx.fillStyle = P.ink;
      ctx.font = "500 30px 'Noto Serif Thai'";
      ctx.fillText(tt.infographicTitle, 44, 66);
      ctx.fillStyle = P.inkSoft;
      ctx.font = "400 13px 'IBM Plex Sans Thai'";
      const dateStr = new Date().toLocaleString(dateLocale, { dateStyle: "long", timeStyle: "short" });
      ctx.fillText(dateStr, 44, 88);

      let y = 128;

      const priceRows: [string, number, number][] = [
        [tt.barLabel, toDisplay(market.barBuy), toDisplay(market.barSell)],
        [tt.jewelryLabel, toDisplay(market.jewelryBuy), toDisplay(market.jewelrySell)],
      ];
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(w - 44, y);
      ctx.stroke();
      y += 8;
      ctx.fillStyle = P.inkSoft;
      ctx.font = "600 10px 'IBM Plex Sans Thai'";
      ctx.fillText(tt.infographicBoardTitle, 44, y + 16);
      y += 20;

      priceRows.forEach(([label, buy, sell]) => {
        y += rowH;
        ctx.strokeStyle = P.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(44, y - rowH + 14);
        ctx.lineTo(w - 44, y - rowH + 14);
        ctx.stroke();

        ctx.fillStyle = P.ink;
        ctx.font = "400 15px 'IBM Plex Sans Thai'";
        ctx.fillText(label, 44, y - 4);

        ctx.textAlign = "right";
        ctx.fillStyle = P.inkSoft;
        ctx.font = "400 10px 'IBM Plex Sans Thai'";
        ctx.fillText(tt.buyLabel, w - 250, y - 26);
        ctx.fillText(tt.sellLabel, w - 90, y - 26);
        ctx.fillStyle = P.ink;
        ctx.font = "700 16px 'Space Mono'";
        ctx.fillText(fmt(buy, digits), w - 250, y - 6);
        ctx.fillStyle = P.red;
        ctx.fillText(fmt(sell, digits), w - 90, y - 6);
        ctx.textAlign = "left";
      });

      y += 44;

      const summary: [string, string, string][] = [
        [tt.infographicWeightTotal, `${fmt(stats.totalWeight, 2)} ${tt.bahtUnit}`, P.ink],
        [tt.infographicAvgCost, `${fmt(toDisplay(stats.avgCost), digits)} ${suffix}`, P.ink],
        [tt.infographicCurrentValue, `${fmt(toDisplay(stats.currentValue), digits)} ${suffix}`, P.ink],
        [
          tt.infographicPl,
          `${stats.pl >= 0 ? "+" : ""}${fmt(toDisplay(stats.pl), digits)} ${suffix} (${stats.plPct >= 0 ? "+" : ""}${fmt(stats.plPct, 2)}%)`,
          stats.pl >= 0 ? P.profit : P.loss,
        ],
      ];
      const cardW = (w - 88 - 24) / 2;
      summary.forEach(([label, val, color], i) => {
        const cx = 44 + (i % 2) * (cardW + 24);
        const cy = y + Math.floor(i / 2) * 90;
        ctx.strokeStyle = P.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + cardW, cy);
        ctx.stroke();
        ctx.fillStyle = P.inkSoft;
        ctx.font = "600 10px 'IBM Plex Sans Thai'";
        ctx.fillText(label.toUpperCase(), cx, cy + 22);
        ctx.fillStyle = color;
        ctx.font = "700 19px 'Space Mono'";
        ctx.fillText(val, cx, cy + 50);
      });
      y += 90 * Math.ceil(summary.length / 2) + 24;

      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(w - 44, y);
      ctx.stroke();
      y += 30;

      ctx.fillStyle = P.ink;
      ctx.font = "500 16px 'Noto Serif Thai'";
      ctx.fillText(tt.infographicChartTitle, 44, y);
      y += 18;

      const maxAbs = Math.max(1, ...chartData.map((d) => Math.abs(d.pl)));
      const barMaxW = w - 88 - 190;
      chartData.forEach((d) => {
        y += 46;
        ctx.fillStyle = P.inkSoft;
        ctx.font = "400 12px 'IBM Plex Sans Thai'";
        ctx.fillText(d.name, 44, y);
        const bw = Math.max(4, (Math.abs(d.pl) / maxAbs) * barMaxW);
        ctx.fillStyle = d.pl >= 0 ? P.profit : P.loss;
        ctx.fillRect(44, y + 6, bw, 3);
        ctx.font = "700 13px 'Space Mono'";
        ctx.fillText(`${d.pl >= 0 ? "+" : ""}${fmt(d.pl, digits)} ${suffix}`, 44 + bw + 10, y + 10);
      });

      y += 50;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(w - 44, y);
      ctx.stroke();
      y += 26;
      ctx.fillStyle = P.inkFaint;
      ctx.font = "400 11px 'IBM Plex Sans Thai'";
      const priceCredit = priceStatus === "live" ? tt.infographicCreditLive : tt.infographicCreditEstimate;
      ctx.fillText(priceCredit, 44, y);

      const dataUrl = canvas.toDataURL("image/png");
      setPreviewUrl(dataUrl);
      return dataUrl;
    } finally {
      setGenerating(false);
    }
  }

  // A raw `data:` URI in an <a download> silently fails to save on iOS
  // Safari (and can hit URL-length limits elsewhere). A blob: object URL
  // downloads reliably on desktop/Android, and on iOS Safari (which never
  // honors the `download` attribute) it at least opens the image so the
  // user can long-press → save — either way this beats a dead click.
  function downloadImage(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }

  async function handleShare() {
    const url = previewUrl || (await generateInfographic());
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "gold-summary.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title: string }) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: tt.infographicTitle });
        setShareNote("");
      } else {
        downloadImage(blob, `gold-summary-${Date.now()}.png`);
        setShareNote(tt.shareUnsupported);
      }
    } catch {
      setShareNote(tt.shareFailed);
    }
  }

  // Compact, screenshot-ready price card — just the board (no portfolio),
  // styled to be instantly legible at a glance so it works as a share
  // image on its own, with our logo/branding baked in.
  async function generatePriceCard() {
    setGeneratingCard(true);
    setCardShareNote("");
    const P = CANVAS_PALETTE[theme];
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.load("700 30px 'Noto Serif Thai'");
        await document.fonts.load("400 16px 'IBM Plex Sans Thai'");
        await document.fonts.load("700 16px 'Space Mono'");
        await document.fonts.ready;
      }
      const logo = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = "/images/logo-badge.png";
      });

      const w = 720;
      const bandH = 128;
      const h = 560;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = P.paper;
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#f0b429");
      grad.addColorStop(1, "#b87d0a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, bandH);

      if (logo) {
        const r = 34;
        const cx = 74;
        const cy = bandH / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = "#fdeec2";
        ctx.fill();
        ctx.clip();
        ctx.drawImage(logo, cx - r + 6, cy - r + 6, (r - 6) * 2, (r - 6) * 2);
        ctx.restore();
      }

      ctx.fillStyle = "#211a0e";
      ctx.font = "700 30px 'Noto Serif Thai'";
      ctx.fillText(tt.priceCardTitle, 128, bandH / 2 - 4);
      ctx.font = "500 15px 'IBM Plex Sans Thai'";
      ctx.fillStyle = "#4a3005";
      ctx.fillText("ทองวันนี้ราคา.com", 128, bandH / 2 + 22);

      const dateStr = now.toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" });
      const timeStr = now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
      ctx.textAlign = "right";
      ctx.fillStyle = "#211a0e";
      ctx.font = "600 14px 'IBM Plex Sans Thai'";
      ctx.fillText(`${dateStr} · ${timeStr}`, w - 32, bandH / 2 - 6);
      if (priceSeq != null) {
        ctx.fillStyle = "#4a3005";
        ctx.font = "500 13px 'IBM Plex Sans Thai'";
        ctx.fillText(tt.seqLabel(priceSeq), w - 32, bandH / 2 + 16);
      }
      ctx.textAlign = "left";

      let y = bandH + 44;
      const rows: [string, number, number][] = [
        [tt.barLabel, toDisplay(market.barBuy), toDisplay(market.barSell)],
        [tt.jewelryLabel, toDisplay(market.jewelryBuy), toDisplay(market.jewelrySell)],
      ];

      ctx.fillStyle = P.inkFaint;
      ctx.font = "600 13px 'IBM Plex Sans Thai'";
      ctx.fillText("96.5%", 44, y);
      ctx.textAlign = "right";
      ctx.fillText(tt.buyLabel, w - 250, y);
      ctx.fillText(tt.sellLabel, w - 60, y);
      ctx.textAlign = "left";
      y += 20;
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(w - 44, y);
      ctx.stroke();

      rows.forEach(([label, buy, sell]) => {
        y += 78;
        ctx.fillStyle = P.ink;
        ctx.font = "600 20px 'IBM Plex Sans Thai'";
        ctx.fillText(label, 44, y);

        ctx.textAlign = "right";
        ctx.fillStyle = P.profit;
        ctx.font = "700 34px 'Space Mono'";
        ctx.fillText(fmt(buy, digits), w - 250, y + 6);
        ctx.fillText(fmt(sell, digits), w - 60, y + 6);
        ctx.textAlign = "left";

        y += 24;
        ctx.strokeStyle = P.line;
        ctx.beginPath();
        ctx.moveTo(44, y);
        ctx.lineTo(w - 44, y);
        ctx.stroke();
      });

      y += 56;
      if (changeToday != null && changeToday !== 0) {
        const up = changeToday > 0;
        ctx.fillStyle = up ? "rgba(18,168,84,0.14)" : "rgba(225,61,43,0.14)";
        const label = up ? tt.todayChangeUp(fmt(changeToday, 0)) : tt.todayChangeDown(fmt(Math.abs(changeToday), 0));
        ctx.font = "700 20px 'IBM Plex Sans Thai'";
        const textW = ctx.measureText(label).width;
        const padX = 20;
        const pillW = textW + padX * 2;
        const pillH = 44;
        const pillX = w / 2 - pillW / 2;
        ctx.beginPath();
        ctx.roundRect(pillX, y - pillH / 2, pillW, pillH, 999);
        ctx.fill();
        ctx.fillStyle = up ? P.profit : P.red;
        ctx.textAlign = "center";
        ctx.fillText(label, w / 2, y + 7);
        ctx.textAlign = "left";
      } else if (changeToday === 0) {
        ctx.fillStyle = P.inkFaint;
        ctx.font = "600 18px 'IBM Plex Sans Thai'";
        ctx.textAlign = "center";
        ctx.fillText(tt.todayChangeFlat, w / 2, y + 7);
        ctx.textAlign = "left";
      }

      y = h - 40;
      ctx.strokeStyle = P.line;
      ctx.beginPath();
      ctx.moveTo(44, y - 24);
      ctx.lineTo(w - 44, y - 24);
      ctx.stroke();
      ctx.fillStyle = P.inkFaint;
      ctx.font = "400 12px 'IBM Plex Sans Thai'";
      ctx.fillText(tt.priceCardCredit, 44, y);

      return canvas.toDataURL("image/png");
    } finally {
      setGeneratingCard(false);
    }
  }

  async function handleSharePriceCard() {
    const url = await generatePriceCard();
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "gold-price-today.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title: string }) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: tt.priceCardTitle });
        setCardShareNote("");
      } else {
        downloadImage(blob, `gold-price-today-${Date.now()}.png`);
        setCardShareNote(tt.shareUnsupported);
      }
    } catch {
      setCardShareNote(tt.shareFailed);
    }
  }

  // A dedicated save-to-device button, separate from handleSharePriceCard's
  // OS share sheet — some mobile browsers' native share sheet only offers
  // "copy image" for this kind of share, with no visible save/download
  // option, leaving users with no way to actually save the file.
  async function handleSavePriceCard() {
    const url = await generatePriceCard();
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      downloadImage(blob, `gold-price-today-${Date.now()}.png`);
      setCardShareNote("");
    } catch {
      setCardShareNote(tt.shareFailed);
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ background: C.paper }}>
      <div style={{ background: "var(--hero-gradient)" }}>
      <header className="max-w-2xl mx-auto px-6 pt-10 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-badge.png" alt="" className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
            <div>
              <Eyebrow className="mb-2">{tt.eyebrow}</Eyebrow>
              <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight" style={{ color: C.ink }}>
                {tt.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full overflow-hidden" style={{ background: C.cardSoft }}>
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? tt.themeToLight : tt.themeToDark}
                title={theme === "dark" ? tt.themeToLight : tt.themeToDark}
                className="p-2.5 transition hover:opacity-80"
                style={{ color: C.ink }}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div style={{ width: 1, alignSelf: "stretch", background: C.line }} />
              <button
                onClick={toggleLocale}
                aria-label={locale === "th" ? tt.langToEn : tt.langToTh}
                title={locale === "th" ? tt.langToEn : tt.langToTh}
                className="px-2.5 font-mono-led text-xs font-bold transition hover:opacity-80"
                style={{ color: C.ink }}
              >
                {locale === "th" ? "EN" : "TH"}
              </button>
            </div>
            <div className="flex gap-1 p-1 rounded-full" style={{ background: C.cardSoft }}>
              {(["THB", "USD"] as const).map((cur) => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className="font-mono-led text-sm font-bold px-3 py-1.5 rounded-full transition"
                  style={{
                    color: currency === cur ? C.ink : C.inkSoft,
                    background: currency === cur ? "var(--accent-gradient)" : "transparent",
                    boxShadow: currency === cur ? "0 2px 8px -2px rgba(184,125,10,0.5)" : "none",
                  }}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="font-body text-[14px]" style={{ color: C.inkSoft }}>
            {now.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-mono-led text-sm flex items-center gap-1.5" style={{ color: C.inkSoft }}>
            USD/THB {fmt(exchangeRate, 2)}
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: rateStatus === "live" ? C.profit : C.gold }}
              title={rateStatus === "live" ? tt.liveLabel : tt.manualLabel}
            />
          </span>
        </div>

        {googleConfigured && (
          <div className="flex items-center justify-between mt-3 rounded-full px-4 py-2" style={{ background: C.cardSoft }}>
            <p className="font-body text-[13px]" style={{ color: C.inkFaint }}>
              {syncNote ||
                (syncStatus === "signed-out" && tt.syncLocalOnly) ||
                (syncStatus === "signing-in" && tt.syncSigningIn) ||
                (syncStatus === "syncing" && tt.syncSyncing) ||
                (syncStatus === "synced" && tt.syncSynced) ||
                tt.syncFailed}
            </p>
            {driveToken ? (
              <button
                onClick={signOutOfGoogle}
                className="flex items-center gap-1.5 font-body text-[13px] font-semibold"
                style={{ color: C.inkSoft }}
              >
                <Cloud size={13} style={{ color: C.profit }} /> {tt.syncSignOut}
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={syncStatus === "signing-in"}
                className="flex items-center gap-1.5 font-body text-[13px] font-semibold"
                style={{ color: C.ink }}
              >
                <CloudOff size={13} style={{ color: C.inkFaint }} /> {tt.syncSignIn}
              </button>
            )}
          </div>
        )}
      </header>
      </div>

      <main className="max-w-2xl mx-auto px-6 pb-20 space-y-6">
        <AffiliateBanner startIndex={0} />

        {/* Price board */}
        <section className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-1">
            <SectionHeading>{tt.priceBoardHeading}</SectionHeading>
            <div className="flex items-center gap-1 mb-4">
              <button
                onClick={handleSavePriceCard}
                disabled={generatingCard}
                aria-label={tt.savePriceCard}
                title={tt.savePriceCard}
                className="flex items-center justify-center rounded-full p-1.5 transition hover:bg-black/[0.04]"
                style={{ color: C.gold }}
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleSharePriceCard}
                disabled={generatingCard}
                className={`${pillGhost} px-3 py-1.5 text-[13px]`}
                style={{ color: C.gold }}
              >
                <Share2 size={13} /> {tt.sharePriceCard}
              </button>
              <button
                onClick={refreshLivePrices}
                aria-label={tt.refreshAria}
                className="flex items-center justify-center rounded-full p-1.5 transition hover:bg-black/[0.04]"
                disabled={priceStatus === "loading"}
              >
                <RefreshCw
                  size={13}
                  style={{ color: C.inkFaint, animation: priceStatus === "loading" ? "spin 1s linear infinite" : "none" }}
                />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: priceStatus === "live" ? C.profit : priceStatus === "estimated" ? C.gold : C.inkFaint }}
            />
            <p className="font-body text-[13px]" style={{ color: C.inkFaint }}>
              {priceStatus === "live"
                ? `${tt.priceLive}${priceUpdatedAt ? tt.updatedAt(priceUpdatedAt.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })) : ""}`
                : priceStatus === "estimated"
                  ? `${tt.priceEstimatedFallback}${priceUpdatedAt ? tt.updatedAt(priceUpdatedAt.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })) : ""}`
                  : priceStatus === "loading"
                    ? tt.priceLoading
                    : tt.priceFailed}
            </p>
          </div>
          {(priceSeq != null || changeToday != null || priceUpdatedAt) && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              {priceSeq != null && (
                <span
                  className="font-body text-[11px] font-semibold px-2 py-1 rounded-full"
                  style={{ background: C.cardSoft, color: C.inkSoft }}
                >
                  {tt.seqLabel(priceSeq)}
                </span>
              )}
              {changeToday != null && (
                <span
                  className="font-body text-[11px] font-semibold px-2 py-1 rounded-full"
                  style={{
                    background: changeToday > 0 ? "rgba(18,168,84,0.14)" : changeToday < 0 ? "rgba(225,61,43,0.14)" : C.cardSoft,
                    color: changeToday > 0 ? C.profit : changeToday < 0 ? C.red : C.inkSoft,
                  }}
                >
                  {changeToday > 0
                    ? tt.todayChangeUp(fmt(changeToday, 0))
                    : changeToday < 0
                      ? tt.todayChangeDown(fmt(Math.abs(changeToday), 0))
                      : tt.todayChangeFlat}
                </span>
              )}
              {priceUpdatedAt && (
                <span className="font-body text-[11px] px-2 py-1 rounded-full" style={{ background: C.cardSoft, color: C.inkFaint }}>
                  {(() => {
                    const mins = Math.max(0, Math.floor((now.getTime() - priceUpdatedAt.getTime()) / 60000));
                    return mins < 1 ? tt.updatedAgoJustNow : tt.updatedAgoMinutes(mins);
                  })()}
                </span>
              )}
            </div>
          )}
          {cardShareNote && (
            <p className="font-body text-[12px] mb-3" style={{ color: C.inkFaint }}>
              {cardShareNote}
            </p>
          )}
          <PriceRow
            label={tt.barLabel}
            buy={toDisplay(market.barBuy)}
            sell={toDisplay(market.barSell)}
            digits={digits}
            buyLabel={tt.buyLabel}
            sellLabel={tt.sellLabel}
          />
          <PriceRow
            label={tt.jewelryLabel}
            buy={toDisplay(market.jewelryBuy)}
            sell={toDisplay(market.jewelrySell)}
            digits={digits}
            buyLabel={tt.buyLabel}
            sellLabel={tt.sellLabel}
          />
          <PriceRow
            label={tt.ozLabel}
            buy={toDisplay(market.barBuy) / BAHT_TO_OZ}
            sell={toDisplay(market.barSell) / BAHT_TO_OZ}
            digits={2}
            buyLabel={tt.buyLabel}
            sellLabel={tt.sellLabel}
          />
          <a
            href="/widget"
            className="block text-center mt-4 pt-4 font-body text-[15px] font-semibold"
            style={{ borderTop: `1px solid ${C.line}`, color: C.gold }}
          >
            {tt.widgetCta}
          </a>
        </section>

        {/* World gold spot — TradingView */}
        <section className="p-5" style={cardStyle}>
          <SectionHeading>{tt.worldChartHeading}</SectionHeading>
          <TradingViewGoldWidget theme={theme} locale={locale} />
          <p className="font-body text-[12px] mt-2 text-right" style={{ color: C.inkFaint }}>
            {tt.worldChartCredit}
          </p>
        </section>

        {/* Price alert */}
        <section className="p-5" style={cardStyle}>
          <SectionHeading>
            <span className="inline-flex items-center gap-1.5">
              <Bell size={14} style={{ color: C.gold }} /> {tt.alertHeading}
            </span>
          </SectionHeading>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <select
                value={alertDirection}
                onChange={(e) => setAlertDirection(e.target.value as "above" | "below")}
                className={`${inputClass} font-body text-sm shrink-0`}
                style={{ ...inputStyle, width: "auto" }}
              >
                <option value="above">{tt.alertAbove}</option>
                <option value="below">{tt.alertBelow}</option>
              </select>
              <input
                type="number"
                placeholder={tt.alertPlaceholder}
                value={alertTarget}
                onChange={(e) => setAlertTarget(e.target.value)}
                className={`${inputClass} flex-1 min-w-0 text-base`}
                style={inputStyle}
              />
            </div>
            <button
              onClick={armAlert}
              disabled={alertArmed}
              className={`${pillPrimary} px-4 w-full sm:w-auto shrink-0`}
              style={
                alertArmed
                  ? { background: C.cardSoft, color: C.inkFaint }
                  : accentButtonStyle
              }
            >
              {alertArmed ? tt.alertArming : tt.alertArm}
            </button>
          </div>
          {alertNote && (
            <p className="font-body text-[14px] mt-2" style={{ color: C.gold }}>
              {alertNote}
            </p>
          )}
          <p className="font-body text-[13px] mt-2" style={{ color: C.inkFaint }}>
            {tt.alertNote}
          </p>
        </section>

        {/* Portfolio */}
        <section className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <SectionHeading>{tt.portfolioHeading}</SectionHeading>
            <button onClick={addEntry} className={`${pillPrimary} px-3.5 py-2`} style={accentButtonStyle}>
              <Plus size={13} /> {tt.addEntry}
            </button>
          </div>

          <div className="space-y-2">
            {entries.map((e) => {
              const w = weightInBaht(e);
              const p = Number(e.price) || 0;
              const fee = Number(e.makingCharge) || 0;
              const pl = w * (currentPrice - p) - fee;
              const isProfit = pl >= 0;
              const miniInput = "font-mono-led text-xs rounded-lg px-2 py-1.5 outline-none w-full";
              const miniInputStyle = { background: C.card, color: C.ink, border: `1px solid ${C.line}` };
              return (
                <div key={e.id} className="rounded-xl p-2.5" style={{ background: C.cardSoft }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <input
                      value={e.label}
                      onChange={(ev) => updateEntry(e.id, { label: ev.target.value })}
                      className="font-body text-sm font-medium bg-transparent outline-none flex-1 min-w-0"
                      style={{ color: C.ink }}
                    />
                    <select
                      value={e.type}
                      onChange={(ev) => updateEntry(e.id, { type: ev.target.value as "bar" | "jewelry" })}
                      className="font-body text-[11px] rounded-lg px-1.5 py-1 outline-none shrink-0"
                      style={miniInputStyle}
                    >
                      <option value="bar">{tt.typeBar}</option>
                      <option value="jewelry">{tt.typeJewelry}</option>
                    </select>
                    <button
                      onClick={() => removeEntry(e.id)}
                      aria-label={tt.removeEntryAria}
                      className="rounded-full p-1 shrink-0 transition hover:bg-black/[0.05]"
                    >
                      <Trash2 size={13} style={{ color: C.inkFaint }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="flex items-center gap-1 rounded-lg px-1.5" style={miniInputStyle}>
                      <input
                        type="number"
                        step="0.01"
                        value={e.weight}
                        onChange={(ev) => updateEntry(e.id, { weight: ev.target.value })}
                        title={tt.weightLabel}
                        className="font-mono-led text-xs py-1.5 outline-none w-full min-w-0 bg-transparent"
                        style={{ color: C.ink }}
                      />
                      <select
                        value={e.unit || "baht"}
                        onChange={(ev) => updateEntry(e.id, { unit: ev.target.value as "baht" | "salung" })}
                        className="font-body text-[10px] bg-transparent outline-none shrink-0"
                        style={{ color: C.inkFaint }}
                      >
                        <option value="baht">{tt.unitBaht}</option>
                        <option value="salung">{tt.unitSalung}</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumberInput(e.price)}
                      onChange={(ev) => updateEntry(e.id, { price: unformatNumberInput(ev.target.value) })}
                      title={tt.priceLabel}
                      placeholder={tt.priceLabel}
                      className={miniInput}
                      style={miniInputStyle}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumberInput(e.makingCharge || 0)}
                      onChange={(ev) => updateEntry(e.id, { makingCharge: unformatNumberInput(ev.target.value) })}
                      title={tt.makingChargeLabel}
                      placeholder={tt.makingChargeLabel}
                      className={miniInput}
                      style={miniInputStyle}
                    />
                    <span
                      className="font-mono-led text-xs font-bold flex items-center justify-end gap-0.5"
                      style={{ color: isProfit ? C.profit : C.loss }}
                      title={tt.summaryPl}
                    >
                      {isProfit ? "+" : ""}
                      {fmt(toDisplay(pl), digits)}
                    </span>
                  </div>
                </div>
              );
            })}
            {entries.length === 0 && (
              <p className="font-body text-base text-center py-8 rounded-xl" style={{ color: C.inkFaint, background: C.cardSoft }}>
                {tt.entryEmpty}
              </p>
            )}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.line}` }}>
            <label className="font-body text-sm" style={{ color: C.inkSoft }}>
              {tt.valuationBasisLabel}{" "}
              <select
                value={valuationBasis}
                onChange={(e) => setValuationBasis(e.target.value as ValuationBasis)}
                className="font-body text-sm bg-transparent outline-none underline"
                style={{ color: C.ink }}
              >
                <option value="barBuy">{tt.basisBarBuy}</option>
                <option value="barSell">{tt.basisBarSell}</option>
                <option value="jewelryBuy">{tt.basisJewelryBuy}</option>
                <option value="jewelrySell">{tt.basisJewelrySell}</option>
              </select>
            </label>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <SummaryCard label={tt.summaryWeight} value={`${fmt(stats.totalWeight, 2)} ${tt.bahtUnit}`} />
          <SummaryCard label={tt.summaryCost} value={`${fmt(toDisplay(stats.totalCost), digits)} ${suffix}`} />
          <SummaryCard label={tt.summaryAvgCost} value={`${fmt(toDisplay(stats.avgCost), digits)} ${suffix}`} />
          <SummaryCard label={tt.summaryValue} value={`${fmt(toDisplay(stats.currentValue), digits)} ${suffix}`} />
          <SummaryCard
            label={tt.summaryPl}
            value={`${stats.pl >= 0 ? "+" : ""}${fmt(toDisplay(stats.pl), digits)} ${suffix}`}
            accent={stats.pl >= 0 ? C.profit : C.loss}
            highlight={stats.pl >= 0 ? "profit" : undefined}
            className="col-span-2"
            sub={`${stats.plPct >= 0 ? "+" : ""}${fmt(stats.plPct, 2)}%`}
          />
        </section>

        {/* Share / export */}
        <section className="p-5" style={cardStyle}>
          <SectionHeading>{tt.shareHeading}</SectionHeading>
          <p className="font-body text-[14px] mb-4" style={{ color: C.inkFaint }}>
            {tt.shareDesc}
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const url = previewUrl || (await generateInfographic());
                if (!url) return;
                const blob = await (await fetch(url)).blob();
                downloadImage(blob, `gold-summary-${Date.now()}.png`);
              }}
              disabled={generating}
              className={`${pillPrimary} flex-1 py-2.5`}
              style={{ ...accentButtonStyle, opacity: generating ? 0.6 : 1 }}
            >
              <Download size={14} /> {generating ? tt.generatingImage : tt.saveImage}
            </button>
            <button
              onClick={handleShare}
              disabled={generating}
              className={`${pillGhost} flex-1 py-2.5`}
              style={{ background: C.cardSoft, color: C.ink, opacity: generating ? 0.6 : 1 }}
            >
              <Share2 size={14} /> {tt.shareToFriend}
            </button>
          </div>
          {shareNote && (
            <p className="font-body text-[14px] mt-2" style={{ color: C.gold }}>
              {shareNote}
            </p>
          )}

          {previewUrl && (
            <div className="mt-4 relative">
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute top-2 right-2 rounded-full p-1"
                style={{ background: C.ink }}
                aria-label={tt.closePreviewAria}
              >
                <X size={12} color={C.paper} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={tt.previewAlt} className="w-full rounded-xl" style={{ border: `1px solid ${C.line}` }} />
            </div>
          )}
        </section>

        <AffiliateBanner startIndex={2} />

        <section className="p-5" style={cardStyle}>
          <SectionHeading>{tt.chartHeading}</SectionHeading>
          <div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="0" stroke={C.line} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fontFamily: "IBM Plex Sans Thai", fill: C.inkSoft }}
                  axisLine={{ stroke: C.line }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: "Space Mono", fill: C.inkSoft }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${fmt(Number(v), digits)} ${suffix}`, tt.chartTooltipLabel]}
                  contentStyle={{ fontFamily: "IBM Plex Sans Thai", fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 12 }}
                />
                <ReferenceLine y={0} stroke={C.ink} />
                <Bar dataKey="pl" radius={[0, 0, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* SEO / educational content */}
        <section className="p-5" style={cardStyle}>
          <SectionHeading>{tt.faqHeading}</SectionHeading>
          <details className="rounded-xl p-4" style={{ background: C.cardSoft }}>
            <summary className="font-body text-sm font-semibold cursor-pointer" style={{ color: C.ink }}>
              {tt.faq1Q}
            </summary>
            <p className="font-body text-sm mt-3 leading-relaxed" style={{ color: C.inkSoft }}>
              {tt.faq1A}
            </p>
          </details>
          <details className="rounded-xl p-4 mt-3" style={{ background: C.cardSoft }}>
            <summary className="font-body text-sm font-semibold cursor-pointer" style={{ color: C.ink }}>
              {tt.faq2Q}
            </summary>
            <p className="font-body text-sm mt-3 leading-relaxed" style={{ color: C.inkSoft }}>
              {tt.faq2A}
            </p>
          </details>
          <details className="rounded-xl p-4 mt-3" style={{ background: C.cardSoft }}>
            <summary className="font-body text-sm font-semibold cursor-pointer" style={{ color: C.ink }}>
              {tt.faq3Q}
            </summary>
            <p className="font-body text-sm mt-3 leading-relaxed" style={{ color: C.inkSoft }}>
              {tt.faq3A}
            </p>
          </details>
        </section>

        {latestArticles.length > 0 ? (
          <section className="p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <SectionHeading>{tt.newsHeading}</SectionHeading>
              <a href="/articles" className="font-body text-sm font-semibold" style={{ color: C.gold }}>
                {tt.newsViewAll}
              </a>
            </div>
            <div className="space-y-3">
              {latestArticles.map((a) => (
                <a
                  key={a.slug}
                  href={`/articles/${a.slug}`}
                  className="block rounded-xl p-4 transition hover:brightness-[0.98]"
                  style={{ background: C.cardSoft }}
                >
                  <div className="font-body text-[12px]" style={{ color: C.inkFaint }}>
                    {a.date}
                  </div>
                  <div className="font-display text-base font-medium mt-1" style={{ color: C.ink }}>
                    {a.title}
                  </div>
                  {a.excerpt && (
                    <p className="font-body text-sm mt-1.5 leading-relaxed line-clamp-2" style={{ color: C.inkSoft }}>
                      {a.excerpt}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </section>
        ) : (
          <section className="p-5 flex items-center justify-between" style={cardStyle}>
            <span className="font-body text-sm" style={{ color: C.inkSoft }}>
              {tt.articlesPrompt}
            </span>
            <a href="/articles" className={`${pillGhost} px-4 py-2 shrink-0`} style={{ color: C.gold }}>
              {tt.articlesCta}
            </a>
          </section>
        )}

        <section className="p-5" style={cardStyle}>
          <ShareButtons url={SITE_URL} title={tt.title} />
        </section>

        <AffiliateBanner startIndex={4} />

        <div className="text-center">
          <a href="/widget" className="font-body text-[15px] font-semibold underline" style={{ color: C.gold }}>
            {tt.widgetCta}
          </a>
        </div>
      </main>
    </div>
  );
}
