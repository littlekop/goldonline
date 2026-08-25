"use client";

import { useEffect, useRef } from "react";

// Official free TradingView embed (no API key / signup needed) — mini symbol
// overview widget for world gold spot (XAU/USD). Re-mounts the script whenever
// theme/locale change since TradingView renders once into the container.
// Wrapped defensively: the embed is a third-party script that can be blocked
// by ad-blockers, extensions, or a strict CSP, and shouldn't be able to crash
// the rest of the page if that happens.
export default function TradingViewGoldWidget({
  theme,
  locale,
}: {
  theme: "light" | "dark";
  locale: "th" | "en";
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let widgetDiv: HTMLDivElement | null = null;
    let script: HTMLScriptElement | null = null;

    try {
      while (container.firstChild) container.removeChild(container.firstChild);

      widgetDiv = document.createElement("div");
      widgetDiv.className = "tradingview-widget-container__widget";
      container.appendChild(widgetDiv);

      script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
      script.async = true;
      script.type = "text/javascript";
      script.text = JSON.stringify({
        symbol: "OANDA:XAUUSD",
        width: "100%",
        height: 220,
        locale: locale === "th" ? "th" : "en",
        dateRange: "1D",
        colorTheme: theme,
        isTransparent: true,
        autosize: true,
        largeChartUrl: "",
      });
      container.appendChild(script);
    } catch {
      // third-party embed failed to init (blocked script, CSP, etc.) — the
      // section still shows its heading/credit line, just without the chart
    }

    return () => {
      try {
        if (container) while (container.firstChild) container.removeChild(container.firstChild);
      } catch {
        // ignore cleanup errors from the third-party widget's own DOM writes
      }
    };
  }, [theme, locale]);

  return <div className="tradingview-widget-container" ref={containerRef} style={{ minHeight: 220 }} />;
}
