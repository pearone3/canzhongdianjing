/* ============================================
   喰种电竞 · 报单系统 Chart.js 通用配置
   依赖：Chart.js v4 (CDN)
   ============================================ */

(function () {
  "use strict";

  if (typeof Chart !== "undefined") {
    Chart.defaults.color = "#8b949e";
    Chart.defaults.borderColor = "rgba(48, 54, 61, 0.6)";
    Chart.defaults.font.family =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = "#161b22";
    Chart.defaults.plugins.tooltip.titleColor = "#e6edf3";
    Chart.defaults.plugins.tooltip.bodyColor = "#8b949e";
    Chart.defaults.plugins.tooltip.borderColor = "#30363d";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }

  const COLORS = {
    primary: "#d4a017",
    primaryLight: "rgba(212, 160, 23, 0.15)",
    blue: "#58a6ff",
    blueLight: "rgba(88, 166, 255, 0.15)",
    green: "#2ea043",
    greenLight: "rgba(46, 160, 67, 0.15)",
    red: "#f85149",
    purple: "#bc8cff",
    orange: "#f0883e",
    cyan: "#39c5cf",
  };

  const ChartHelper = {
    COLORS,

    renderLine(canvas, labels, data, opts = {}) {
      const el = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
      if (!el || typeof Chart === "undefined") return null;
      const color = opts.color || COLORS.primary;
      const ctx = el.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 0, el.height || 260);
      gradient.addColorStop(0, this._hexToRgba(color, 0.25));
      gradient.addColorStop(1, this._hexToRgba(color, 0));

      return new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: opts.label || "接单量",
            data,
            borderColor: color,
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: opts.smooth === false ? 0 : 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
          }],
        },
        options: this._baseOptions(opts),
      });
    },

    renderBar(canvas, labels, data, opts = {}) {
      const el = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
      if (!el || typeof Chart === "undefined") return null;
      const color = opts.color || COLORS.blue;
      return new Chart(el, {
        type: "bar",
        data: { labels, datasets: [{ label: opts.label || "数量", data, backgroundColor: this._hexToRgba(color, 0.7), borderColor: color, borderWidth: 1, borderRadius: 4, maxBarThickness: 36 }] },
        options: this._baseOptions(opts),
      });
    },

    renderMultiLine(canvas, labels, datasets, opts = {}) {
      const el = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
      if (!el || typeof Chart === "undefined") return null;
      const ds = datasets.map((d) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color || COLORS.primary,
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
      }));
      return new Chart(el, {
        type: "line",
        data: { labels, datasets: ds },
        options: this._baseOptions(opts),
      });
    },

    renderHorizontalBar(canvas, labels, data, opts = {}) {
      const el = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
      if (!el || typeof Chart === "undefined") return null;
      const color = opts.color || COLORS.primary;
      return new Chart(el, {
        type: "bar",
        data: { labels, datasets: [{ label: opts.label || "数量", data, backgroundColor: this._hexToRgba(color, 0.7), borderColor: color, borderWidth: 1, borderRadius: 4, maxBarThickness: 24 }] },
        options: { ...this._baseOptions(opts), indexAxis: "y" },
      });
    },

    _baseOptions(opts) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: opts.showLegend !== false, position: "top", align: "end" },
          tooltip: { callbacks: opts.tooltipCallbacks || {} },
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
          y: { beginAtZero: true, grid: { color: "rgba(48, 54, 61, 0.4)" }, ticks: { precision: 0 } },
        },
      };
    },

    _hexToRgba(hex, alpha) {
      const h = hex.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
  };

  window.ChartHelper = ChartHelper;
})();