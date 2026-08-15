/* ============================================
   喰种电竞 · 报单系统 Supabase 客户端 + 公共工具
   ============================================ */

(function () {
  "use strict";

  // ==========================================
  //  ⚠️  配置区：请替换为你自己的 Supabase 项目信息
  // ==========================================
  const SUPABASE_URL = "https://mdokgjgvujusuhrkvkrm.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_baOJGI-MkMLxmA0a-GPoOQ_jg4DfuzU"; // 请替换为实际 key

  const DEFAULT_REGISTER_SECRET = "czdj888";

  // ==========================================
  //  初始化 Supabase 客户端
  // ==========================================
  let _supabase = null;
  function getSupabase() {
    if (!_supabase) {
      if (typeof supabase === "undefined" || !supabase.createClient) {
        console.error("[Supabase] SDK 未加载");
        return null;
      }
      _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _supabase;
  }

  // ==========================================
  //  本地会话管理
  // ==========================================
  const SESSION_KEY = "csz_report_session";

  const Auth = {
    getCurrentUser() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    isLoggedIn() { return !!this.getCurrentUser(); },
    getRole() { const u = this.getCurrentUser(); return u ? u.role : null; },
    isManager() { return this.getRole() === "manager"; },
    setSession(user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, loginAt: Date.now() }));
    },
    logout() {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = getBasePath() + "login.html";
    },
    guard(requiredRole) {
      const user = this.getCurrentUser();
      if (!user) {
        window.location.href = getBasePath() + "login.html";
        return false;
      }
      if (requiredRole && user.role !== requiredRole) {
        const target = user.role === "manager"
          ? "pages/manager/dashboard.html"
          : "pages/player/dashboard.html";
        window.location.href = getBasePath() + target;
        return false;
      }
      return true;
    },
  };

  // ==========================================
  //  路径工具
  // ==========================================
  function getBasePath() {
    const path = window.location.pathname;
    if (path.includes("/pages/")) {
      return "../../../";
    }
    return "";
  }

  // ==========================================
  //  数据库操作
  // ==========================================
  const DB = {
    // ---------- 打手账号 ----------
    async registerPlayer(username, password) {
      const sb = getSupabase();
      const { data: exist } = await sb
        .from("players")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (exist) throw new Error("该昵称已被注册");

      const { data, error } = await sb
        .from("players")
        .insert([{
          username,
          password_hash: password,
          total_orders: 0,
          total_hours: 0,
          total_income: 0,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async loginPlayer(username, password) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("players")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("账号不存在");
      if (data.password_hash !== password) throw new Error("密码错误");
      return { id: data.id, username: data.username, role: "player" };
    },

    async loginManager(username, password) {
      const sb = getSupabase();
      const { data: setting } = await sb
        .from("system_settings")
        .select("value")
        .eq("key", "manager_credentials")
        .maybeSingle();

      let adminUser = "admin";
      let adminPass = "admin123";
      if (setting && setting.value) {
        try {
          const cred = JSON.parse(setting.value);
          adminUser = cred.username || adminUser;
          adminPass = cred.password || adminPass;
        } catch (e) {}
      }
      if (username !== adminUser) throw new Error("管理员账号不存在");
      if (password !== adminPass) throw new Error("管理员密码错误");
      return { id: 0, username: "管理员", role: "manager" };
    },

    async getAllPlayers() {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("players")
        .select("*")
        .order("total_orders", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getPlayerById(id) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("players")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    // ---------- 报单 ----------
    async createReport(report) {
      const sb = getSupabase();
      const orderNumber = await this.generateOrderNumber();
      const { data, error } = await sb
        .from("reports")
        .insert([{ ...report, order_number: orderNumber, status: "pending" }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async generateOrderNumber() {
      const sb = getSupabase();
      const { data } = await sb
        .from("reports")
        .select("order_number")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      let next = 1;
      if (data && data.order_number) {
        const n = parseInt(data.order_number, 10);
        if (!isNaN(n)) next = n + 1;
      }
      return String(next).padStart(6, "0");
    },

    async getAllReports(filters = {}) {
      const sb = getSupabase();
      let q = sb.from("reports").select("*, players(username)");
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.player_id) q = q.eq("player_id", filters.player_id);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getReportsByPlayer(playerId) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("reports")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async reviewReport(id, status, remark = "") {
      const sb = getSupabase();
      const { data: report } = await sb
        .from("reports")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!report) throw new Error("报单不存在");

      const { data, error } = await sb
        .from("reports")
        .update({ status, review_remark: remark, reviewed_at: new Date() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      if (status === "approved" && report.status !== "approved") {
        await this._incrementPlayerStats(report.player_id, report);
      }
      return data;
    },

    async _incrementPlayerStats(playerId, report) {
      const sb = getSupabase();
      const { data: player } = await sb
        .from("players")
        .select("total_orders, total_hours, total_income")
        .eq("id", playerId)
        .maybeSingle();
      if (!player) return;
      const price = parseFloat(report.price) || 0;
      await sb
        .from("players")
        .update({
          total_orders: (player.total_orders || 0) + 1,
          total_hours: (player.total_hours || 0) + (parseFloat(report.hours) || 0),
          total_income: (player.total_income || 0) + price,
        })
        .eq("id", playerId);
    },

    // ---------- 公告 ----------
    async getAnnouncements() {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async createAnnouncement(title, content) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("announcements")
        .insert([{ title, content }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async updateAnnouncement(id, title, content) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("announcements")
        .update({ title, content })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteAnnouncement(id) {
      const sb = getSupabase();
      const { error } = await sb.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },

    // ---------- 系统设置 ----------
    async getRegisterSecret() {
      const sb = getSupabase();
      const { data } = await sb
        .from("system_settings")
        .select("value")
        .eq("key", "register_secret")
        .maybeSingle();
      return data ? data.value : DEFAULT_REGISTER_SECRET;
    },

    async setRegisterSecret(secret) {
      const sb = getSupabase();
      const { data: exist } = await sb
        .from("system_settings")
        .select("key")
        .eq("key", "register_secret")
        .maybeSingle();
      if (exist) {
        await sb.from("system_settings").update({ value: secret }).eq("key", "register_secret");
      } else {
        await sb.from("system_settings").insert([{ key: "register_secret", value: secret }]);
      }
    },

    // ---------- 统计 ----------
    async getApprovedReportsLastDays(days = 30) {
      const sb = getSupabase();
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await sb
        .from("reports")
        .select("*")
        .eq("status", "approved")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return data || [];
    },
  };

  // ==========================================
  //  通用工具
  // ==========================================
  const Utils = {
    formatDate(date) {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "-";
      return d.toISOString().slice(0, 10);
    },
    formatDateTime(date) {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "-";
      return d.toISOString().slice(0, 16).replace("T", " ");
    },
    escapeHtml(str) {
      if (str == null) return "";
      const div = document.createElement("div");
      div.textContent = String(str);
      return div.innerHTML;
    },
    formatNumber(n) {
      const num = Number(n);
      if (isNaN(num)) return "0";
      return num.toLocaleString("zh-CN");
    },
    statusText(status) {
      const map = { pending: "待审核", approved: "已通过", rejected: "已驳回" };
      return map[status] || status;
    },
    statusBadgeClass(status) {
      const map = { pending: "badge-pending", approved: "badge-approved", rejected: "badge-rejected" };
      return map[status] || "badge-info";
    },
    showToast(message, type = "info") {
      let container = document.querySelector(".toast-container");
      if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
      }
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
      }, 2800);
    },
    debounce(fn, wait = 300) {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
      };
    },
    getLastDaysLabels(days = 30) {
      const labels = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      }
      return labels;
    },
    aggregateByDate(reports, days = 30) {
      const labels = this.getLastDaysLabels(days);
      const counts = new Array(days).fill(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      reports.forEach((r) => {
        const d = new Date(r.created_at);
        d.setHours(0, 0, 0, 0);
        const diff = Math.floor((today - d) / 86400000);
        if (diff >= 0 && diff < days) {
          counts[days - 1 - diff]++;
        }
      });
      return { labels, counts };
    },
  };

  // ==========================================
  //  导航栏渲染
  // ==========================================
  function renderNavbar(activeKey) {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const isMgr = user.role === "manager";
    const base = getBasePath();

    const playerNav = [
      { key: "dashboard", label: "仪表盘", href: "pages/player/dashboard.html" },
      { key: "report", label: "提交报单", href: "pages/player/report.html" },
      { key: "performance", label: "我的绩效", href: "pages/player/performance.html" },
      { key: "public", label: "公共看板", href: "pages/public/index.html" },
    ];
    const managerNav = [
      { key: "dashboard", label: "总览", href: "pages/manager/dashboard.html" },
      { key: "reports", label: "报单管理", href: "pages/manager/reports.html" },
      { key: "announcements", label: "公告管理", href: "pages/manager/announcements.html" },
      { key: "players", label: "打手管理", href: "pages/manager/players.html" },
      { key: "settings", label: "系统设置", href: "pages/manager/settings.html" },
      { key: "public", label: "公共看板", href: "pages/public/index.html" },
    ];
    const nav = isMgr ? managerNav : playerNav;

    const navHtml = nav
      .map(
        (item) =>
          `<a href="${base}${item.href}" class="${item.key === activeKey ? "active" : ""}">${item.label}</a>`
      )
      .join("");

    const roleLabel = isMgr ? "管理员" : "打手";
    const initial = (user.username || "?").charAt(0).toUpperCase();

    const html = `
      <nav class="navbar">
        <a href="${base}${isMgr ? "pages/manager/dashboard.html" : "pages/player/dashboard.html"}" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;">
          <div class="logo-dot"></div>
          <span style="font-size:16px;font-weight:700;letter-spacing:1px;">喰种电竞</span>
          <span style="font-size:12px;color:var(--text-muted);">报单系统</span>
        </a>
        <div class="navbar-nav">${navHtml}</div>
        <div class="navbar-right">
          <div class="user-badge">
            <div class="avatar">${Utils.escapeHtml(initial)}</div>
            <span>${Utils.escapeHtml(user.username)}</span>
            <span class="role-tag">${roleLabel}</span>
          </div>
          <button class="btn btn-outline btn-sm" id="logoutBtn">退出</button>
        </div>
      </nav>
    `;
    document.body.insertAdjacentHTML("afterbegin", html);
    document.getElementById("logoutBtn").addEventListener("click", () => {
      Auth.logout();
    });
  }

  // ==========================================
  //  导出到全局
  // ==========================================
  window.App = {
    supabase: getSupabase,
    Auth,
    DB,
    Utils,
    renderNavbar,
    getBasePath,
    DEFAULT_REGISTER_SECRET,
  };
})();