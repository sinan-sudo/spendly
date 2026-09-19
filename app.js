const storageKey = "spendly-expenses-v1";
const budgetKey = "spendly-budget-v1";
const profileKey = "spendly-profile-v1";
const categories = {
  "Food & dining": { icon: "⌁", color: "#e8894b" }, Groceries: { icon: "♧", color: "#a9cf64" }, Transport: { icon: "↗", color: "#7daec3" }, Shopping: { icon: "♢", color: "#9c8dcc" }, "Bills & utilities": { icon: "⌁", color: "#d0ab57" }, Health: { icon: "✚", color: "#e28a9b" }, Entertainment: { icon: "◐", color: "#5ba5a2" }, Other: { icon: "•", color: "#87938a" }
};
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const shortMoney = value => value >= 1000 ? `₹${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k` : money.format(value);
let selectedDate = new Date(); selectedDate.setDate(1);
let budget = Number(localStorage.getItem(budgetKey)) || 25000;
let expenses = JSON.parse(localStorage.getItem(storageKey) || "[]");
let profileName = localStorage.getItem(profileKey) || "Alex";

const $ = id => document.getElementById(id);
const dialog = $("expenseDialog"), budgetDialog = $("budgetDialog"), profileDialog = $("profileDialog");
function ymd(date) { const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10); }
function save() { localStorage.setItem(storageKey, JSON.stringify(expenses)); }
function expenseMonth(item) { const d = new Date(`${item.date}T12:00:00`); return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth(); }
function monthExpenses() { return expenses.filter(expenseMonth); }
function total(items) { return items.reduce((sum, item) => sum + Number(item.amount), 0); }
function monthName(date) { return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }); }
function displayDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[c]); }

function renderHeader(items) {
  const amount = total(items), days = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  $("monthDisplay").textContent = monthName(selectedDate); $("chartPeriod").textContent = `${selectedDate.toLocaleDateString("en-IN", { month: "short" })} 1–${days}`;
  $("totalSpent").textContent = money.format(amount); $("dailyAverage").textContent = money.format(Math.round(amount / days));
  $("monthlyChange").textContent = items.length ? `${items.length} recorded expense${items.length !== 1 ? "s" : ""}` : "No expenses yet";
  const grouped = groupByCategory(items), top = Object.entries(grouped).sort((a,b) => b[1] - a[1])[0];
  $("topCategory").textContent = top ? top[0] : "—"; $("topCategoryAmount").textContent = top ? money.format(top[1]) : "Add your first expense";
  $("budgetAmount").textContent = money.format(budget); const percentage = Math.min((amount / budget) * 100, 100); $("budgetProgress").style.width = `${percentage}%`;
  $("budgetText").textContent = amount > budget ? `${money.format(amount - budget)} over your budget` : `${money.format(budget - amount)} left this month`;
}
function groupByCategory(items) { return items.reduce((groups, item) => { groups[item.category] = (groups[item.category] || 0) + Number(item.amount); return groups; }, {}); }
function renderChart(items) {
  const days = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate(), today = new Date(); const isCurrent = today.getFullYear() === selectedDate.getFullYear() && today.getMonth() === selectedDate.getMonth();
  const byDay = Array.from({ length: days }, (_, i) => total(items.filter(item => Number(item.date.slice(-2)) === i + 1))); const max = Math.max(...byDay, 1);
  $("dailyChart").innerHTML = byDay.map((value, i) => `<div class="bar-col"><div class="bar ${value ? "has-spend" : ""} ${isCurrent && i + 1 === today.getDate() ? "today" : ""}" style="height:${Math.max(3, value / max * 100)}%" data-tip="${i + 1} ${selectedDate.toLocaleDateString("en-IN", { month: "short" })}: ${money.format(value)}"></div></div>`).join("");
}
function renderCategories(items) {
  const group = Object.entries(groupByCategory(items)).sort((a,b) => b[1] - a[1]); const amount = total(items); let running = 0;
  const stops = group.map(([name, value]) => { const start = running; running += value / (amount || 1) * 360; return `${categories[name]?.color || "#87938a"} ${start}deg ${running}deg`; });
  $("donutChart").style.background = stops.length ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#e7ebe5 0deg 360deg)"; $("donutTotal").textContent = shortMoney(amount);
  $("categoryLegend").innerHTML = group.slice(0, 4).map(([name, value]) => `<div class="legend-row"><i class="legend-dot" style="background:${categories[name]?.color || "#87938a"}"></i><span class="legend-label">${escapeHTML(name)}</span><span class="legend-value">${Math.round(value / (amount || 1) * 100)}%</span></div>`).join("") || "<span class=\"transaction-meta\">Categories will appear here.</span>";
}
function renderTransactions() {
  const query = $("searchExpenses").value.trim().toLowerCase(), method = $("paymentFilter").value;
  const items = monthExpenses().filter(item => (!query || `${item.title} ${item.category} ${item.account || ""}`.toLowerCase().includes(query)) && (method === "all" || item.method === method)).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  $("transactionList").innerHTML = items.map(item => { const cat = categories[item.category] || categories.Other; return `<div class="transaction-row"><div class="transaction-icon" style="background:${cat.color}22;color:${cat.color}">${cat.icon}</div><div><div class="transaction-title">${escapeHTML(item.title)}</div><div class="transaction-meta">${escapeHTML(item.category)}${item.account ? ` · ${escapeHTML(item.account)}` : ""}</div></div><div class="method-chip">${escapeHTML(item.method)}</div><div class="transaction-meta transaction-date">${displayDate(item.date)}</div><div class="amount">−${money.format(item.amount)}</div><button class="delete-button" type="button" data-delete="${item.id}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete expense">×</button></div>`; }).join("");
  $("emptyState").hidden = items.length !== 0; $("transactionList").hidden = items.length === 0;
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => { expenses = expenses.filter(item => item.id !== button.dataset.delete); save(); render(); }));
}
function render() { const items = monthExpenses(); renderHeader(items); renderChart(items); renderCategories(items); renderTransactions(); }
function renderProfile() { $("profileName").textContent = profileName; $("profileNameInput").value = profileName; $("avatar").textContent = profileName.trim().charAt(0).toUpperCase() || "A"; }
function openExpense() { $("expenseForm").reset(); $("expenseDate").value = ymd(new Date()); dialog.showModal(); $("expenseTitle").focus(); }

$("openExpense").addEventListener("click", openExpense); $("emptyAdd").addEventListener("click", openExpense);
$("previousMonth").addEventListener("click", () => { selectedDate.setMonth(selectedDate.getMonth() - 1); render(); });
$("nextMonth").addEventListener("click", () => { selectedDate.setMonth(selectedDate.getMonth() + 1); render(); });
$("expenseForm").addEventListener("submit", event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); expenses.push({ ...data, amount: Number(data.amount), id: crypto.randomUUID(), createdAt: Date.now() }); save(); selectedDate = new Date(`${data.date}T12:00:00`); selectedDate.setDate(1); dialog.close(); render(); });
$("cancelExpense").addEventListener("click", () => dialog.close()); document.querySelector(".close-dialog").addEventListener("click", () => dialog.close());
$("manageBudget").addEventListener("click", () => { $("budgetInput").value = budget; budgetDialog.showModal(); });
$("budgetForm").addEventListener("submit", event => { event.preventDefault(); budget = Number($("budgetInput").value); localStorage.setItem(budgetKey, budget); budgetDialog.close(); render(); });
$("cancelBudget").addEventListener("click", () => budgetDialog.close()); document.querySelector(".close-budget").addEventListener("click", () => budgetDialog.close());
$("avatar").addEventListener("click", () => { $("profileNameInput").value = profileName; profileDialog.showModal(); $("profileNameInput").focus(); });
$("profileForm").addEventListener("submit", event => { event.preventDefault(); profileName = $("profileNameInput").value.trim() || "Alex"; localStorage.setItem(profileKey, profileName); profileDialog.close(); renderProfile(); });
$("cancelProfile").addEventListener("click", () => profileDialog.close()); document.querySelector(".close-profile").addEventListener("click", () => profileDialog.close());
$("searchExpenses").addEventListener("input", renderTransactions); $("paymentFilter").addEventListener("change", renderTransactions);
$("showAllCategories").addEventListener("click", () => { $("searchExpenses").value = ""; $("paymentFilter").value = "all"; document.querySelector("#transactions").scrollIntoView({ behavior: "smooth" }); });
$("exportData").addEventListener("click", () => { const csv = ["Date,Title,Category,Amount,Payment method,Account", ...expenses.map(x => [x.date,x.title,x.category,x.amount,x.method,x.account || ""].map(v => `\"${String(v).replaceAll('"','""')}\"`).join(","))].join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" })); a.download = "spendly-expenses.csv"; a.click(); URL.revokeObjectURL(a.href); });
render();
renderProfile();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
