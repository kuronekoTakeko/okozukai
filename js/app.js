(function () {
  "use strict";

  var STORAGE_KEY = "okozukai-ledger-v1";

  // 📅 現在の年・月と、選択されている月の管理
  var todayDateObj = new Date();
  var currentAppYear = todayDateObj.getFullYear();   // 2026年
  var currentAppMonth = todayDateObj.getMonth() + 1;  // 5月
  var selectedAppMonth = currentAppMonth;            // 初期値は今月（5月）

  // 💡 設定用のデータ（色、クイック金額）を初期値として定義します
  var state = {
    records: [],
    currentType: "income",
    config: {
      bgColor: "#f0f7ff",      // 全体の背景
      titleColor: "#000000",    // おこづかい帳の文字色
      balanceBg: "#4f9cf9",     // 残高カードの背景
      btnAddBg: "#4f9cf9",      // きろくするボタンの背景
      tabBodyBg: "#ffffff",     // タブ内の背景
      quickAmounts: [10, 50, 100, 500, 1000] // クイック金額の初期値
    }
  };

  var els = {
    todayDate: document.getElementById("today-date"),
    balance: document.getElementById("balance"),
    memo: document.getElementById("memo"),
    amount: document.getElementById("amount"),
    quickAmounts: document.getElementById("quick-amounts"),
    historyList: document.getElementById("history-list"),
    historyEmpty: document.getElementById("history-empty"),
    btnIncome: document.getElementById("btn-income"),
    btnExpense: document.getElementById("btn-expense"),
    btnAdd: document.getElementById("btn-add"),
    monthButtonContainer: document.getElementById("monthButtonContainer"),
    monthTotalIn: document.getElementById("monthTotalIn"),
    monthTotalOut: document.getElementById("monthTotalOut"),
    toast: document.getElementById("toast"),
    tabRecord: document.getElementById("tab-record"),
    tabHistory: document.getElementById("tab-history"),
    panelRecord: document.getElementById("panel-record"),
    panelHistory: document.getElementById("panel-history"),
    tabsRoot: document.querySelector(".tabs--ears"),
  };

  // 🔢 金額のカンマ区切り
  function formatNumber(n) {
    return n.toLocaleString("ja-JP");
  }

  // 📅 日付の表示変換
  function formatDate(iso) {
    var d = new Date(iso);
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var h = d.getHours();
    var min = String(d.getMinutes()).padStart(2, "0");
    return m + "月" + day + "日 " + h + ":" + min;
  }

  function formatTodayDate() {
    var d = new Date();
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }

  function setTodayDate() {
    if (els.todayDate) {
      els.todayDate.textContent = formatTodayDate();
    }
  }

  // 🧹 1年経った同じ月のデータを自動で上書き消去する関数
  function checkAndCleanOldData(records) {
    if (!Array.isArray(records)) return [];
    return records.filter(function (record) {
      var rYear = record.year || new Date(record.createdAt).getFullYear();
      var rMonth = record.month || (new Date(record.createdAt).getMonth() + 1);
      
      var isOldSameMonth = (rYear < currentAppYear && rMonth === currentAppMonth);
      return !isOldSameMonth;
    });
  }

  // 💾 データの読み込み
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.records)) {
        state.records = checkAndCleanOldData(data.records);
        save();
      }
    } catch (e) {
      console.warn("読み込みに失敗しました", e);
    }
  }

  // 💾 データの保存
  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ records: state.records })
      );
    } catch (e) {
      showToast("保存できませんでした");
    }
  }

  // 👛 残高の計算
  function getBalance() {
    return state.records.reduce(function (sum, r) {
      return sum + (r.type === "income" ? r.amount : -r.amount);
    }, 0);
  }
    function renderBalance() {
    var isHistoryVisible = els.panelHistory && !els.panelHistory.hidden;
    var balanceLabelEl = document.querySelector(".balance-card__label");

    var balance = 0;

    if (isHistoryVisible) {
      var filteredRecords = state.records.filter(function (r) {
        var rMonth = r.month || (new Date(r.createdAt).getMonth() + 1);
        return rMonth === selectedAppMonth;
      });

      filteredRecords.forEach(function (r) {
        if (r.type === "income") {
          balance += r.amount;
        } else {
          balance -= r.amount;
        }
      });

      if (balanceLabelEl) {
        balanceLabelEl.textContent = selectedAppMonth + "月のおかねのまとめ";
      }
    } else {
      balance = getBalance();
      if (balanceLabelEl) {
        balanceLabelEl.textContent = "いまの残高";
      }
    }

    if (els.balance) {
      els.balance.textContent = formatNumber(balance);
      els.balance.style.color = balance < 0 ? "#ff6b6b" : "";
    }
  }

  function renderHistory() {
    if (!els.historyList) return;

    els.historyList.innerHTML = "";

    var totalIn = 0;
    var totalOut = 0;

    var filteredRecords = state.records.filter(function (r) {
      var rMonth = r.month || (new Date(r.createdAt).getMonth() + 1);
      return rMonth === selectedAppMonth;
    });

    filteredRecords.forEach(function (r) {
      if (r.type === "income") {
        totalIn += r.amount;
      } else {
        totalOut += r.amount;
      }
    });

    if (els.monthTotalIn) els.monthTotalIn.innerText = formatNumber(totalIn);
    if (els.monthTotalOut) els.monthTotalOut.innerText = formatNumber(totalOut);

    if (filteredRecords.length === 0) {
      var empty = document.createElement("li");
      empty.className = "history-list__empty";
      empty.id = "history-empty";
      empty.textContent = "まだきろくがありません";
      els.historyList.appendChild(empty);
      return;
    }
        var displayItems = filteredRecords.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    displayItems.forEach(function (record) {
      var li = document.createElement("li");
      li.className = "history-item";

      var isIncome = record.type === "income";
      var typeClass = isIncome ? "income" : "expense";

      var icon = document.createElement("div");
      icon.className = "history-item__icon history-item__icon--" + typeClass;
      icon.textContent = isIncome ? "➕" : "➖";
      icon.setAttribute("aria-hidden", "true");

      var body = document.createElement("div");
      body.className = "history-item__body";

      var memo = document.createElement("p");
      memo.className = "history-item__memo";
      memo.textContent = record.memo || (isIncome ? "もらった" : "つかった");

      var date = document.createElement("p");
      date.className = "history-item__date";
      date.textContent = formatDate(record.createdAt);

      body.appendChild(memo);
      body.appendChild(date);

      var amountEl = document.createElement("p");
      amountEl.className = "history-item__amount history-item__amount--" + typeClass;
      amountEl.textContent = (isIncome ? "+" : "-") + formatNumber(record.amount);

      var del = document.createElement("button");
      del.type = "button";
      del.className = "history-item__delete";
      del.setAttribute("aria-label", "このきろくをけす");
      del.textContent = "🗑";
      del.dataset.id = record.id;

      li.appendChild(icon);
      li.appendChild(body);
      li.appendChild(amountEl);
      li.appendChild(del);
      els.historyList.appendChild(li);
    });
  }

  function render() {
    renderBalance();
    renderHistory();
  }

  function createMonthButtons() {
    if (!els.monthButtonContainer) return;
    els.monthButtonContainer.innerHTML = "";

    for (var m = 1; m <= 12; m++) {
      (function (monthNum) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "month-btn" + (monthNum === selectedAppMonth ? " active" : "");
        btn.innerText = monthNum + "月";

        btn.addEventListener("click", function () {
          selectedAppMonth = monthNum;
          var allBtns = els.monthButtonContainer.querySelectorAll(".month-btn");
          for (var i = 0; i < allBtns.length; i++) {
            allBtns[i].classList.remove("active");
          }
          btn.classList.add("active");
          renderHistory();
          renderBalance();
        });
        els.monthButtonContainer.appendChild(btn);
      })(m);
    }
  }

  function setType(type) {
    state.currentType = type;
    els.btnIncome.classList.toggle("type-toggle__btn--active", type === "income");
    els.btnExpense.classList.toggle("type-toggle__btn--active", type === "expense");
  }

  function setTab(tabName) {
    var isRecord = tabName === "record";
    
    if (els.tabRecord && els.tabHistory) {
      els.tabRecord.classList.toggle("tabs__btn--active", isRecord);
      els.tabHistory.classList.toggle("tabs__btn--active", !isRecord);
      
      els.tabRecord.setAttribute("aria-selected", isRecord ? "true" : "false");
      els.tabHistory.setAttribute("aria-selected", isRecord ? "false" : "true");
      els.tabRecord.tabIndex = isRecord ? 0 : -1;
      els.tabHistory.tabIndex = isRecord ? -1 : 0;
    }
    
    if (els.panelRecord && els.panelHistory) {
      els.panelRecord.hidden = !isRecord;
      els.panelHistory.hidden = isRecord;
    }
    
    document.body.classList.toggle("is-record-tab", isRecord);
    if (els.tabsRoot) {
      els.tabsRoot.classList.toggle("is-history-active", !isRecord);
    }

    render();
    if (typeof applyConfigUi === "function") applyConfigUi();
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("toast--show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      els.toast.classList.remove("toast--show");
    }, 2200);
  }
    function addRecord() {
    var memo = els.memo.value.trim();
    var amount = parseInt(els.amount.value, 10);

    if (!amount || amount < 1) {
      showToast("金額を入れてね");
      els.amount.focus();
      return;
    }

    if (amount > 999999) {
      showToast("金額が大きすぎます");
      return;
    }

    var record = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      year: currentAppYear,
      month: currentAppMonth,
      type: state.currentType,
      memo: memo,
      amount: amount,
      createdAt: new Date().toISOString(),
    };

    state.records.push(record);
    save();

    els.memo.value = "";
    els.amount.value = "";
    els.memo.focus();

    selectedAppMonth = currentAppMonth;
    createMonthButtons();
    render();

    showToast(state.currentType === "income" ? "もらったをきろくしたよ！" : "つかったをきろくしたよ！");
  }

  function deleteRecord(id) {
    if (!confirm("このきろくをけしてもいいですか？")) return;
    state.records = state.records.filter(function (r) {
      return r.id !== id;
    });
    save();
    render();
    showToast("きろくをけしたよ");
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function (err) {
        console.warn("Service Worker の登録に失敗:", err);
      });
    });
  }

  function loadConfig() {
    var raw = localStorage.getItem(STORAGE_KEY + "-config");
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed) {
          state.config = Object.assign({}, state.config, parsed);
        }
      } catch (e) {
        console.warn("設定の読み込みに失敗しました", e);
      }
    }
    applyConfigUi();
  }

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY + "-config", JSON.stringify(state.config));
    } catch (e) {
      console.warn("設定の保存に失敗しました");
    }
  }

  function applyConfigUi() {
    var cfg = state.config;

    document.body.style.backgroundColor = cfg.bgColor;
    if (els.todayDate) {
      els.todayDate.style.border = "1px solid #000000";
    }

    var titleEl = document.querySelector(".header__title");
    if (titleEl) titleEl.style.color = cfg.titleColor;

    var balanceCard = document.querySelector(".balance-card");
    if (balanceCard) balanceCard.style.background = cfg.balanceBg;

    if (els.btnAdd) els.btnAdd.style.backgroundColor = cfg.btnAddBg;

    if (els.panelRecord) els.panelRecord.style.backgroundColor = cfg.tabBodyBg;
    if (els.panelHistory) els.panelHistory.style.backgroundColor = cfg.tabBodyBg;
    
    var activeTab = document.querySelector(".tabs__btn--active");
    if (activeTab) activeTab.style.backgroundColor = cfg.tabBodyBg;

    var inputBg = document.getElementById("cfg-bg-color");
    var inputTitle = document.getElementById("cfg-title-color");
    var inputBalance = document.getElementById("cfg-balance-bg");
    var inputBtnAdd = document.getElementById("cfg-btn-add-bg");
    var inputTabBody = document.getElementById("cfg-tab-body-bg");

    if (inputBg) inputBg.value = cfg.bgColor;
    if (inputTitle) inputTitle.value = cfg.titleColor;
    if (inputBalance) inputBalance.value = cfg.balanceBg;
    if (inputBtnAdd) inputBtnAdd.value = cfg.btnAddBg;
    if (inputTabBody) inputTabBody.value = cfg.tabBodyBg;

    if (els.quickAmounts) {
      els.quickAmounts.innerHTML = "";
      cfg.quickAmounts.forEach(function (value, index) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quick-amounts__btn";
        btn.textContent = formatNumber(value) + "円";
        btn.addEventListener("click", function () {
          var currentVal = parseInt(els.amount.value, 10) || 0;
          els.amount.value = currentVal + value;
        });
        els.quickAmounts.appendChild(btn);

        var inputQuick = document.getElementById("cfg-quick-" + index);
        if (inputQuick) inputQuick.value = value;
      });
    }
  }

  function initConfigEvents() {
    var openBtn = document.getElementById("open-settings");
    var closeBtn = document.getElementById("close-settings");
    var modal = document.getElementById("settings-modal");

    if (openBtn && modal) {
      openBtn.addEventListener("click", function () {
        modal.removeAttribute("hidden");
      });
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener("click", function () {
        modal.setAttribute("hidden", "");
      });
    }

    var colorIds = ["cfg-bg-color", "cfg-title-color", "cfg-balance-bg", "cfg-btn-add-bg", "cfg-tab-body-bg"];
    var configKeys = ["bgColor", "titleColor", "balanceBg", "btnAddBg", "tabBodyBg"];

    colorIds.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", function (e) {
          state.config[configKeys[i]] = e.target.value;
          applyConfigUi();
          saveConfig();
        });
      }
    });

        for (var i = 0; i < 5; i++) {
      (function (index) {
        var el = document.getElementById("cfg-quick-" + index);
        if (el) {
          // 💡 ① タップされた瞬間に、中の数字をぜんぶ青く選んだ状態にする（すぐ上書きできる）
          el.addEventListener("focus", function (e) {
            e.target.select();
          });

          // 文字が入力されたときの処理
          el.addEventListener("input", function (e) {
            var val = parseInt(e.target.value, 10);
            
            // 💡 空白（空っぽ）のときは、いったん内部データを0にしておく
            if (isNaN(val)) {
              val = 0;
            }
            
            state.config.quickAmounts[index] = val;
            applyConfigUi();
            saveConfig();
          });

          // 💡 ② もし空白のまま別の場所を触ったり画面を閉じたら、自動で「0」を入れるガード
          el.addEventListener("blur", function (e) {
            if (e.target.value.trim() === "") {
              e.target.value = "0";
              state.config.quickAmounts[index] = 0;
              applyConfigUi();
              saveConfig();
            }
          });
        }
      })(i);
    }
    
    var resetBtn = document.getElementById("btn-reset-all");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (confirm("本当に これまでの記録を ぜんぶ消しても いいですか？\n（元には もどせません）")) {
          if (confirm("設定（えらんだ色や金額）も ぜんぶ最初に戻りますが、本当にいいですか？")) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY + "-config");
            showToast("ぜんぶ消去しました。再起動します。");
            setTimeout(function () {
              location.reload();
            }, 1500);
          }
        }
      });
    }
  }

  function initEvents() {
    if (els.btnIncome) els.btnIncome.addEventListener("click", function () { setType("income"); });
    if (els.btnExpense) els.btnExpense.addEventListener("click", function () { setType("expense"); });
    if (els.btnAdd) els.btnAdd.addEventListener("click", addRecord);

    if (els.tabRecord) els.tabRecord.addEventListener("click", function () { setTab("record"); });
    if (els.tabHistory) els.tabHistory.addEventListener("click", function () { setTab("history"); });

    if (els.historyList) {
      els.historyList.addEventListener("click", function (e) {
        var btn = e.target.closest(".history-item__delete");
        if (!btn) return;
        deleteRecord(btn.dataset.id);
      });
    }

    if (els.amount) {
      els.amount.addEventListener("keydown", function (e) {
        if (e.key === "Enter") addRecord();
      });
    }
  }

  load();
  loadConfig();
  setTodayDate();
  initEvents();
  initConfigEvents();
  createMonthButtons();
  setTab("record");
  setType("income");
  registerServiceWorker();

})();
