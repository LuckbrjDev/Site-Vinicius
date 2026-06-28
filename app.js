const STORAGE_KEY = "viniciusExpressState";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const seedState = {
  settings: {
    storeName: "Vinicius Express",
    adminPassword: "admin123",
    deliveryFee: 5,
    minimumDelivery: 20,
    whatsapp: "",
    openForOrders: true,
  },
  categories: [
    { id: "cat_cigarros", name: "Cigarros" },
    { id: "cat_bebidas", name: "Bebidas" },
    { id: "cat_essencias", name: "Essencias" },
    { id: "cat_sedas", name: "Sedas" },
    { id: "cat_acessorios", name: "Acessorios" },
    { id: "cat_conveniencia", name: "Conveniência" },
  ],
  products: [
    {
      id: "prod_1",
      sku: "VE-001",
      name: "Essencia Mint 50g",
      description: "Essencia para narguile com aroma refrescante.",
      categoryId: "cat_essencias",
      costPrice: 8,
      salePrice: 16,
      stock: 18,
      minStock: 5,
      image: "",
      active: true,
      featured: true,
      adultOnly: true,
      status: "active",
    },
    {
      id: "prod_2",
      sku: "VE-002",
      name: "Seda King Size",
      description: "Seda premium para tabacaria.",
      categoryId: "cat_sedas",
      costPrice: 2.5,
      salePrice: 6,
      stock: 35,
      minStock: 8,
      image: "",
      active: true,
      featured: true,
      adultOnly: true,
      status: "active",
    },
    {
      id: "prod_3",
      sku: "VE-003",
      name: "Energetico lata",
      description: "Bebida gelada para retirada ou entrega.",
      categoryId: "cat_bebidas",
      costPrice: 5.5,
      salePrice: 10,
      stock: 22,
      minStock: 6,
      image: "",
      active: true,
      featured: true,
      adultOnly: false,
      status: "active",
    },
    {
      id: "prod_4",
      sku: "VE-004",
      name: "Carvao para narguile",
      description: "Pacote de carvao para sessao.",
      categoryId: "cat_acessorios",
      costPrice: 7,
      salePrice: 14,
      stock: 12,
      minStock: 4,
      image: "",
      active: true,
      featured: false,
      adultOnly: true,
      status: "active",
    },
  ],
  cart: [],
  orders: [],
  expenses: [
    { id: "exp_1", description: "Embalagens", amount: 35, status: "open", dueDate: new Date().toISOString().slice(0, 10) },
  ],
  stockLog: [],
  history: [],
  session: { adminLogged: false, adultConfirmed: false },
};

let state = loadState();
let route = "home";
let selectedCategory = "all";
let searchTerm = "";
let lastOrderText = "";
let activeAdminTab = "dashboard";

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedState);
  try {
    const parsed = JSON.parse(saved);
    return { ...structuredClone(seedState), ...parsed, session: { adminLogged: false, adultConfirmed: parsed.session?.adultConfirmed || false } };
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function categoryName(id) {
  return state.categories.find((cat) => cat.id === id)?.name || "Sem categoria";
}

function productById(id) {
  return state.products.find((product) => product.id === id);
}

function cartTotals(fulfillment = getCheckoutFulfillment()) {
  const subtotal = state.cart.reduce((sum, item) => {
    const product = productById(item.productId);
    return sum + (product ? product.salePrice * item.quantity : 0);
  }, 0);
  const deliveryFee = fulfillment === "delivery" && state.cart.length ? Number(state.settings.deliveryFee || 0) : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

function getCheckoutFulfillment() {
  return document.querySelector("input[name='fulfillment']:checked")?.value || "delivery";
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function navigate(nextRoute) {
  route = nextRoute;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.getElementById(`${route}View`).classList.add("active");
  document.querySelectorAll(".nav-link").forEach((btn) => btn.classList.toggle("active", btn.dataset.route === route));
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  document.querySelectorAll("[data-store-name]").forEach((el) => (el.textContent = state.settings.storeName));
  document.querySelectorAll("[data-cart-count]").forEach((el) => (el.textContent = state.cart.reduce((sum, item) => sum + item.quantity, 0)));
  document.getElementById("ageGate").classList.toggle("hidden", state.session.adultConfirmed);
  renderWhatsappButton();
  renderHome();
  renderShop();
  renderCart();
  renderCheckoutSummary();
  renderAdmin();
  saveState();
}

function renderHome() {
  const grid = document.getElementById("featuredGrid");
  const products = sellableProducts().filter((product) => product.featured).slice(0, 4);
  grid.innerHTML = products.length ? products.map(productCard).join("") : emptyState("Nenhum destaque cadastrado.");
}

function sellableProducts() {
  return state.products.filter((product) => product.active && product.status !== "hidden");
}

function renderShop() {
  const filters = document.getElementById("categoryFilters");
  const categoryButtons = [{ id: "all", name: "Todos" }, ...state.categories]
    .map((cat) => `<button class="filter-chip ${selectedCategory === cat.id ? "active" : ""}" data-category="${cat.id}">${cat.name}</button>`)
    .join("");
  filters.innerHTML = categoryButtons;

  const normalized = searchTerm.trim().toLowerCase();
  const products = sellableProducts().filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
    const matchesSearch = !normalized || product.name.toLowerCase().includes(normalized) || product.description.toLowerCase().includes(normalized);
    return matchesCategory && matchesSearch;
  });
  document.getElementById("productGrid").innerHTML = products.length ? products.map(productCard).join("") : emptyState("Nenhum produto encontrado.");
}

function productCard(product) {
  const out = product.stock <= 0;
  const stockText = out ? "Indisponivel" : "Disponivel";
  const imageMarkup = product.image
    ? `<div class="product-img"><img src="${product.image}" alt="${escapeHtml(product.name)}" onerror="this.closest('.product-img').classList.add('placeholder'); this.outerHTML='<img src=&quot;Logo.png&quot; alt=&quot;Omega Software&quot;>'"></div>`
    : `<div class="product-img placeholder"><img src="Logo.png" alt="Omega Software"></div>`;
  return `
    <article class="product-card">
      ${imageMarkup}
      <div class="product-body">
        <div class="tags">
          <span class="tag">${escapeHtml(categoryName(product.categoryId))}</span>
          ${product.adultOnly ? `<span class="tag restricted">+18</span>` : ""}
          <span class="tag ${out ? "out" : "stock"}">${stockText}</span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description || "Produto de conveniencia.")}</p>
        <div class="price-line">
          <div class="price-wrap">
            <span class="price-label">Preco de venda</span>
            <span class="price">${money.format(product.salePrice)}</span>
          </div>
          <button class="btn slim primary" data-add-cart="${product.id}" ${out ? "disabled" : ""}>Adicionar</button>
        </div>
      </div>
    </article>
  `;
}

function renderCart() {
  const list = document.getElementById("cartItems");
  if (!state.cart.length) {
    list.innerHTML = emptyState("Sua cesta esta vazia.");
  } else {
    list.innerHTML = state.cart.map((item) => {
      const product = productById(item.productId);
      if (!product) return "";
      return `
        <article class="cart-item">
          <div class="cart-thumb">${product.image ? `<img src="${product.image}" alt="${escapeHtml(product.name)}">` : ""}</div>
          <div>
            <strong>${escapeHtml(product.name)}</strong>
            <p class="hint">${escapeHtml(categoryName(product.categoryId))} - ${money.format(product.salePrice)} cada</p>
            <div class="qty">
              <button data-cart-dec="${product.id}">-</button>
              <span>${item.quantity}</span>
              <button data-cart-inc="${product.id}" ${item.quantity >= product.stock ? "disabled" : ""}>+</button>
            </div>
          </div>
          <div class="stack">
            <strong>${money.format(product.salePrice * item.quantity)}</strong>
            <button class="btn slim danger" data-cart-remove="${product.id}">Remover</button>
          </div>
        </article>
      `;
    }).join("");
  }
  const totals = cartTotals();
  document.querySelector("[data-cart-subtotal]").textContent = money.format(totals.subtotal);
  document.querySelector("[data-delivery-fee]").textContent = money.format(totals.deliveryFee);
  document.querySelector("[data-cart-total]").textContent = money.format(totals.total);
  document.getElementById("goCheckoutBtn").disabled = !state.cart.length;
}

function renderCheckoutSummary() {
  const holder = document.getElementById("checkoutSummary");
  if (!holder) return;
  const totals = cartTotals();
  holder.innerHTML = `
    <div class="stack">
      ${state.cart.map((item) => {
        const product = productById(item.productId);
        return product ? `<div class="summary-row"><span>${escapeHtml(product.name)} x${item.quantity}</span><strong>${money.format(product.salePrice * item.quantity)}</strong></div>` : "";
      }).join("") || `<p class="hint">Nenhum item na cesta.</p>`}
      <div class="summary-row"><span>Produtos</span><strong>${money.format(totals.subtotal)}</strong></div>
      <div class="summary-row"><span>Entrega</span><strong>${money.format(totals.deliveryFee)}</strong></div>
      <div class="summary-row total"><span>Total</span><strong>${money.format(totals.total)}</strong></div>
    </div>
  `;
  document.getElementById("pixCode").textContent = `VE-PIX-${Math.floor(100000 + Math.random() * 899999)}`;
}

function renderWhatsappButton() {
  const link = document.getElementById("floatingWhatsapp");
  if (!link) return;
  const phone = onlyDigits(state.settings.whatsapp || "");
  link.classList.toggle("hidden", !phone);
  if (phone) {
    link.href = `https://wa.me/55${phone}?text=${encodeURIComponent(`Ola, gostaria de comprar na ${state.settings.storeName}.`)}`;
  }
}

function renderAdmin() {
  document.getElementById("adminLogin").classList.toggle("hidden", state.session.adminLogged);
  document.getElementById("adminApp").classList.toggle("hidden", !state.session.adminLogged);
  if (!state.session.adminLogged) return;
  renderDashboard();
  renderProductsAdmin();
  renderCategoriesAdmin();
  renderOrdersAdmin();
  renderStockAdmin();
  renderFinanceAdmin();
  renderSettingsAdmin();
  applyAdminTabState();
}

function applyAdminTabState() {
  document.querySelectorAll(".admin-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.adminTab === activeAdminTab));
  document.querySelectorAll(".admin-panel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`${activeAdminTab}Tab`)?.classList.add("active");
}

function financeStats() {
  const paidOrders = state.orders.filter((order) => order.paymentStatus === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const productCost = paidOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.costPrice * item.quantity, 0), 0);
  const expenses = state.expenses.filter((expense) => expense.status === "paid").reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const grossProfit = revenue - productCost;
  const netProfit = grossProfit - expenses;
  return { paidOrders, revenue, productCost, expenses, grossProfit, netProfit };
}

function renderDashboard() {
  const stats = financeStats();
  const lowStock = state.products.filter((product) => product.stock <= product.minStock).length;
  document.getElementById("dashboardTab").innerHTML = `
    <div class="section-head compact"><div><p class="eyebrow">Admin</p><h1>Dashboard</h1></div></div>
    <div class="kpi-grid">
      <div class="kpi"><span>Faturamento</span><strong>${money.format(stats.revenue)}</strong></div>
      <div class="kpi"><span>Lucro bruto</span><strong>${money.format(stats.grossProfit)}</strong></div>
      <div class="kpi"><span>Vendas pagas</span><strong>${stats.paidOrders.length}</strong></div>
      <div class="kpi"><span>Estoque baixo</span><strong>${lowStock}</strong></div>
    </div>
    <div class="table-card">${ordersTable(state.orders.slice(0, 6))}</div>
  `;
}

function renderProductsAdmin() {
  document.getElementById("productsTab").innerHTML = `
    <div class="section-head compact"><div><p class="eyebrow">Catalogo</p><h1>Produtos</h1></div></div>
    <div class="admin-grid">
      <form id="productForm" class="table-card stack" onsubmit="return false">
        <input type="hidden" name="id" />
        <label>Nome<input class="input" name="name" required /></label>
        <label>SKU<input class="input" name="sku" /></label>
        <label>Descricao<textarea class="input" name="description"></textarea></label>
        <label>Categoria<select name="categoryId" required>${state.categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join("")}</select></label>
        <div class="form-grid">
          <label>Preco de custo<input class="input" name="costPrice" type="number" min="0" step="0.01" required /></label>
          <label>Preco de venda<input class="input" name="salePrice" type="number" min="0" step="0.01" required /></label>
          <label>Estoque<input class="input" name="stock" type="number" min="0" step="1" required /></label>
          <label>Estoque minimo<input class="input" name="minStock" type="number" min="0" step="1" value="3" /></label>
        </div>
        <label>Foto<input class="input" name="image" type="file" accept="image/*" /></label>
        <div class="segmented">
          <label><input name="active" type="checkbox" checked /> Ativo</label>
          <label><input name="featured" type="checkbox" /> Destaque</label>
          <label><input name="adultOnly" type="checkbox" checked /> +18</label>
        </div>
        <button class="btn primary" type="button" data-save-product>Salvar produto</button>
        <button id="clearProductForm" class="btn secondary" type="button">Limpar</button>
      </form>
      <div class="table-card table-wrap">
        ${productsTable()}
      </div>
    </div>
  `;
}

function productsTable() {
  return `
    <table>
      <thead><tr><th>Produto</th><th>Categoria</th><th>Venda</th><th>Custo</th><th>Lucro</th><th>Estoque</th><th>Status</th><th>Acoes</th></tr></thead>
      <tbody>
        ${state.products.map((product) => {
          const profit = product.salePrice - product.costPrice;
          return `<tr>
            <td><strong>${escapeHtml(product.name)}</strong><br><span class="hint">${escapeHtml(product.sku || "")}</span></td>
            <td>${escapeHtml(categoryName(product.categoryId))}</td>
            <td>${money.format(product.salePrice)}</td>
            <td>${money.format(product.costPrice)}</td>
            <td>${money.format(profit)}</td>
            <td>${product.stock}</td>
            <td>${statusPill(product.active ? "Ativo" : "Inativo", product.active ? "good" : "bad")}</td>
            <td><div class="row-actions"><button class="btn slim" data-edit-product="${product.id}">Editar</button><button class="btn slim danger" data-delete-product="${product.id}">Remover</button></div></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderCategoriesAdmin() {
  document.getElementById("categoriesTab").innerHTML = `
    <div class="section-head compact"><div><p class="eyebrow">Filtros</p><h1>Categorias</h1></div></div>
    <div class="admin-grid">
      <form id="categoryForm" class="table-card stack" onsubmit="return false">
        <input type="hidden" name="id" />
        <label>Nome da categoria<input class="input" name="name" required /></label>
        <button class="btn primary" type="button" data-save-category>Salvar categoria</button>
      </form>
      <div class="table-card table-wrap">
        <table><thead><tr><th>Categoria</th><th>Produtos</th><th>Acoes</th></tr></thead><tbody>
          ${state.categories.map((cat) => {
            const count = state.products.filter((product) => product.categoryId === cat.id).length;
            return `<tr><td>${escapeHtml(cat.name)}</td><td>${count}</td><td><div class="row-actions"><button class="btn slim" data-edit-category="${cat.id}">Editar</button><button class="btn slim danger" data-delete-category="${cat.id}">Remover</button></div></td></tr>`;
          }).join("")}
        </tbody></table>
      </div>
    </div>
  `;
}

function renderOrdersAdmin() {
  document.getElementById("ordersTab").innerHTML = `
    <div class="section-head compact"><div><p class="eyebrow">Pedidos</p><h1>Vendas</h1></div></div>
    <div class="table-card table-wrap">${ordersTable(state.orders)}</div>
  `;
}

function ordersTable(orders) {
  if (!orders.length) return `<p class="hint">Nenhuma venda registrada.</p>`;
  return `
    <table>
      <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Acoes</th></tr></thead>
      <tbody>
        ${orders.map((order) => `<tr>
          <td><strong>${order.number}</strong><br><span class="hint">${new Date(order.createdAt).toLocaleString("pt-BR")}</span></td>
          <td>${escapeHtml(order.customer.name)}<br><span class="hint">${escapeHtml(order.customer.phone)}</span></td>
          <td>${order.items.map((item) => `${escapeHtml(item.name)} x${item.quantity}`).join("<br>")}</td>
          <td>${money.format(order.total)}</td>
          <td>${statusPill(order.paymentStatus, order.paymentStatus === "paid" ? "good" : "warn")}<br>${order.paymentMethod.toUpperCase()}</td>
          <td>
            <select data-order-status="${order.id}">
              ${["pendente", "pago", "enviado", "concluido", "cancelado"].map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </td>
          <td><div class="row-actions"><button class="btn slim" data-order-paid="${order.id}">Marcar pago</button><button class="btn slim danger" data-order-cancel="${order.id}">Cancelar</button></div></td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderStockAdmin() {
  document.getElementById("stockTab").innerHTML = `
    <div class="section-head compact"><div><p class="eyebrow">Inventario</p><h1>Estoque</h1></div></div>
    <div class="admin-grid">
      <form id="stockForm" class="table-card stack" onsubmit="return false">
        <label>Produto<select name="productId" required>${state.products.map((product) => `<option value="${product.id}">${escapeHtml(product.name)} (${product.stock})</option>`).join("")}</select></label>
        <label>Tipo<select name="type"><option value="entrada">Entrada</option><option value="saida">Saida</option></select></label>
        <label>Quantidade<input class="input" name="quantity" type="number" min="1" step="1" required /></label>
        <label>Motivo<input class="input" name="reason" placeholder="Compra, ajuste, perda..." /></label>
        <button class="btn primary" type="button" data-save-stock>Registrar movimento</button>
      </form>
      <div class="table-card table-wrap">
        <table><thead><tr><th>Produto</th><th>Estoque</th><th>Minimo</th><th>Status</th></tr></thead><tbody>
          ${state.products.map((product) => `<tr><td>${escapeHtml(product.name)}</td><td>${product.stock}</td><td>${product.minStock}</td><td>${statusPill(product.stock <= product.minStock ? "Baixo" : "Ok", product.stock <= product.minStock ? "warn" : "good")}</td></tr>`).join("")}
        </tbody></table>
      </div>
    </div>
    <div class="table-card table-wrap">
      <h2>Historico</h2>
      <table><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Qtd</th><th>Motivo</th></tr></thead><tbody>
        ${state.stockLog.slice().reverse().map((log) => `<tr><td>${new Date(log.date).toLocaleString("pt-BR")}</td><td>${escapeHtml(log.productName)}</td><td>${log.type}</td><td>${log.quantity}</td><td>${escapeHtml(log.reason || "")}</td></tr>`).join("") || `<tr><td colspan="5">Nenhum movimento.</td></tr>`}
      </tbody></table>
    </div>
  `;
}

function renderFinanceAdmin() {
  const stats = financeStats();
  document.getElementById("financeTab").innerHTML = `
    <div class="section-head compact"><div><p class="eyebrow">Financeiro</p><h1>Entradas e saidas</h1></div></div>
    <div class="kpi-grid">
      <div class="kpi"><span>Receita</span><strong>${money.format(stats.revenue)}</strong></div>
      <div class="kpi"><span>Custo vendido</span><strong>${money.format(stats.productCost)}</strong></div>
      <div class="kpi"><span>Despesas pagas</span><strong>${money.format(stats.expenses)}</strong></div>
      <div class="kpi"><span>Lucro estimado</span><strong>${money.format(stats.netProfit)}</strong></div>
    </div>
    <div class="admin-grid">
      <form id="expenseForm" class="table-card stack" onsubmit="return false">
        <label>Descricao<input class="input" name="description" required /></label>
        <label>Valor<input class="input" name="amount" type="number" min="0" step="0.01" required /></label>
        <label>Vencimento<input class="input" name="dueDate" type="date" /></label>
        <label>Status<select name="status"><option value="open">Aberta</option><option value="paid">Paga</option></select></label>
        <button class="btn primary" type="button" data-save-expense>Salvar despesa</button>
      </form>
      <div class="table-card table-wrap">
        <table><thead><tr><th>Descricao</th><th>Valor</th><th>Status</th><th>Vencimento</th><th>Acoes</th></tr></thead><tbody>
          ${state.expenses.map((expense) => `<tr><td>${escapeHtml(expense.description)}</td><td>${money.format(Number(expense.amount || 0))}</td><td>${statusPill(expense.status === "paid" ? "Paga" : "Aberta", expense.status === "paid" ? "good" : "warn")}</td><td>${expense.dueDate || "-"}</td><td><button class="btn slim danger" data-delete-expense="${expense.id}">Remover</button></td></tr>`).join("")}
        </tbody></table>
      </div>
    </div>
  `;
}

function renderSettingsAdmin() {
  document.getElementById("settingsTab").innerHTML = `
    <div class="section-head compact"><div><p class="eyebrow">Loja</p><h1>Configuracoes</h1></div></div>
    <form id="settingsForm" class="table-card stack" onsubmit="return false">
      <div class="form-grid">
        <label>Nome da loja<input class="input" name="storeName" value="${escapeAttr(state.settings.storeName)}" required /></label>
        <label>WhatsApp<input class="input" name="whatsapp" value="${escapeAttr(state.settings.whatsapp || "")}" /></label>
        <label>Taxa de entrega<input class="input" name="deliveryFee" type="number" min="0" step="0.01" value="${state.settings.deliveryFee}" /></label>
        <label>Pedido minimo para entrega<input class="input" name="minimumDelivery" type="number" min="0" step="0.01" value="${state.settings.minimumDelivery}" /></label>
        <label>Nova senha admin<input class="input" name="adminPassword" type="password" placeholder="Manter atual" /></label>
      </div>
      <label class="check-line"><input name="openForOrders" type="checkbox" ${state.settings.openForOrders ? "checked" : ""} /> Loja aberta para pedidos</label>
      <button class="btn primary" type="button" data-save-settings>Salvar configuracoes</button>
    </form>
  `;
}

function statusPill(text, kind) {
  return `<span class="pill ${kind || ""}">${escapeHtml(String(text))}</span>`;
}

function emptyState(text) {
  return `<div class="table-card"><p class="hint">${escapeHtml(text)}</p></div>`;
}

function addToCart(productId) {
  const product = productById(productId);
  if (!product || product.stock <= 0) return toast("Produto indisponivel.");
  const item = state.cart.find((entry) => entry.productId === productId);
  if (item) {
    if (item.quantity >= product.stock) return toast("Quantidade acima do estoque disponivel.");
    item.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }
  toast("Produto adicionado a cesta.");
  render();
}

function updateCart(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  const product = productById(productId);
  if (!item || !product) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter((entry) => entry.productId !== productId);
  if (item.quantity > product.stock) item.quantity = product.stock;
  render();
}

function removeCart(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  render();
}

async function lookupCep() {
  const cepInput = document.getElementById("cepInput");
  const message = document.getElementById("cepMessage");
  const cep = cepInput.value.replace(/\D/g, "");
  if (cep.length !== 8) {
    message.textContent = "Informe um CEP com 8 numeros.";
    return;
  }
  message.textContent = "Consultando CEP...";
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
    if (!response.ok) throw new Error("CEP nao encontrado");
    const data = await response.json();
    const form = document.getElementById("checkoutForm");
    form.street.value = data.street || "";
    form.district.value = data.neighborhood || "";
    form.city.value = data.city || "";
    form.state.value = data.state || "";
    message.textContent = "Endereco localizado. Confira o numero e complemento.";
  } catch (error) {
    message.textContent = "Nao foi possivel localizar o CEP. Preencha manualmente.";
  }
}

function createOrder(formData) {
  if (!state.cart.length) throw new Error("A cesta esta vazia.");
  validateCheckout(formData);
  const fulfillment = formData.get("fulfillment");
  const totals = cartTotals(fulfillment);
  if (fulfillment === "delivery" && totals.subtotal < Number(state.settings.minimumDelivery || 0)) {
    throw new Error(`Pedido minimo para entrega: ${money.format(Number(state.settings.minimumDelivery || 0))}.`);
  }
  for (const item of state.cart) {
    const product = productById(item.productId);
    if (!product || product.stock < item.quantity) throw new Error(`Estoque insuficiente para ${product?.name || "produto"}.`);
  }
  const order = {
    id: uid("order"),
    number: createOrderNumber(),
    createdAt: new Date().toISOString(),
    customer: {
      name: formData.get("name"),
      cpf: formData.get("cpf"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      adultConfirmed: formData.get("adultConfirm") === "on",
    },
    fulfillment,
    address: fulfillment === "delivery" ? {
      cep: formData.get("cep"),
      street: formData.get("street"),
      number: formData.get("number"),
      complement: formData.get("complement"),
      district: formData.get("district"),
      city: formData.get("city"),
      state: formData.get("state"),
      reference: formData.get("reference"),
    } : null,
    items: state.cart.map((item) => {
      const product = productById(item.productId);
      return {
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        categoryId: product.categoryId,
      };
    }),
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    paymentMethod: formData.get("paymentMethod"),
    paymentStatus: formData.get("paymentMethod") === "pix" ? "paid" : "paid",
    transactionId: uid("sim"),
    status: "pago",
  };

  order.items.forEach((item) => {
    const product = productById(item.productId);
    product.stock -= item.quantity;
    state.stockLog.push({ id: uid("stock"), date: new Date().toISOString(), productName: product.name, type: "saida", quantity: item.quantity, reason: `Venda ${order.number}` });
  });
  state.orders.unshift(order);
  state.cart = [];
  lastOrderText = orderSummaryText(order);
  return order;
}

function createOrderNumber() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  return `VE-${stamp}-${String(state.orders.length + 1).padStart(4, "0")}`;
}

function validateCheckout(formData) {
  const cpf = onlyDigits(formData.get("cpf"));
  const phone = onlyDigits(formData.get("phone"));
  if (cpf.length !== 11) throw new Error("Informe um CPF com 11 digitos.");
  if (phone.length < 10 || phone.length > 11) throw new Error("Informe um WhatsApp valido.");
  if (formData.get("fulfillment") === "delivery") {
    const required = ["cep", "street", "number", "district", "city", "state"];
    const missing = required.some((field) => !String(formData.get(field) || "").trim());
    if (missing) throw new Error("Complete os dados de entrega antes de confirmar.");
  }
}

function orderSummaryText(order) {
  const lines = [
    `${state.settings.storeName} - Pedido ${order.number}`,
    `Cliente: ${order.customer.name}`,
    `WhatsApp: ${order.customer.phone}`,
    `Recebimento: ${order.fulfillment === "delivery" ? "Entrega" : "Retirada"}`,
    order.address ? `Endereco: ${order.address.street}, ${order.address.number} - ${order.address.district}, ${order.address.city}/${order.address.state}` : "",
    ...order.items.map((item) => `${item.quantity}x ${item.name} - ${money.format(item.salePrice * item.quantity)}`),
    `Total: ${money.format(order.total)}`,
    `Pagamento: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})`,
  ].filter(Boolean);
  return lines.join("\n");
}

function showSuccess(order) {
  const whatsappPhone = onlyDigits(state.settings.whatsapp || "");
  document.getElementById("successTitle").textContent = `Pedido ${order.number}`;
  document.getElementById("successDetails").innerHTML = `
    <div class="receipt-box">
      <div class="summary-row"><span>Cliente</span><strong>${escapeHtml(order.customer.name)}</strong></div>
      <div class="summary-row"><span>WhatsApp</span><strong>${escapeHtml(order.customer.phone)}</strong></div>
      <div class="summary-row"><span>Pagamento</span><strong>${order.paymentMethod.toUpperCase()} simulado</strong></div>
      <div class="summary-row"><span>Recebimento</span><strong>${order.fulfillment === "delivery" ? "Entrega" : "Retirada"}</strong></div>
      ${order.address ? `<div class="summary-row"><span>Endereco</span><strong>${escapeHtml(`${order.address.street}, ${order.address.number}`)}</strong></div>` : ""}
      <div class="receipt-items">
        ${order.items.map((item) => `<div class="summary-row"><span>${escapeHtml(item.name)} x${item.quantity}</span><strong>${money.format(item.salePrice * item.quantity)}</strong></div>`).join("")}
      </div>
      <div class="summary-row total"><span>Total</span><strong>${money.format(order.total)}</strong></div>
    </div>
  `;
  const whatsappButton = document.getElementById("sendWhatsappBtn");
  whatsappButton.classList.toggle("hidden", !whatsappPhone);
  if (whatsappPhone) {
    whatsappButton.dataset.whatsappUrl = `https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(lastOrderText)}`;
  }
  navigate("success");
}

function readImageAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function bindEvents() {
  document.body.addEventListener("click", (event) => {
    const routeBtn = event.target.closest("[data-route]");
    if (routeBtn) {
      navigate(routeBtn.dataset.route);
      return;
    }

    const addBtn = event.target.closest("[data-add-cart]");
    if (addBtn) {
      addToCart(addBtn.dataset.addCart);
      return;
    }

    const inc = event.target.closest("[data-cart-inc]");
    if (inc) {
      updateCart(inc.dataset.cartInc, 1);
      return;
    }
    const dec = event.target.closest("[data-cart-dec]");
    if (dec) {
      updateCart(dec.dataset.cartDec, -1);
      return;
    }
    const remove = event.target.closest("[data-cart-remove]");
    if (remove) {
      removeCart(remove.dataset.cartRemove);
      return;
    }

    const category = event.target.closest("[data-category]");
    if (category) {
      selectedCategory = category.dataset.category;
      renderShop();
      return;
    }

    const adminTab = event.target.closest("[data-admin-tab]");
    if (adminTab) {
      activeAdminTab = adminTab.dataset.adminTab;
      applyAdminTabState();
      return;
    }

    const editProduct = event.target.closest("[data-edit-product]");
    if (editProduct) {
      fillProductForm(editProduct.dataset.editProduct);
      return;
    }
    const deleteProduct = event.target.closest("[data-delete-product]");
    if (deleteProduct) {
      deleteProductById(deleteProduct.dataset.deleteProduct);
      return;
    }
    if (event.target.id === "clearProductForm") {
      event.target.closest("form")?.reset();
      return;
    }
    const saveProductBtn = event.target.closest("[data-save-product]");
    if (saveProductBtn) {
      saveProduct(saveProductBtn.closest("form"));
      return;
    }
    const saveCategoryBtn = event.target.closest("[data-save-category]");
    if (saveCategoryBtn) {
      saveCategory(saveCategoryBtn.closest("form"));
      return;
    }
    const saveStockBtn = event.target.closest("[data-save-stock]");
    if (saveStockBtn) {
      saveStockMove(saveStockBtn.closest("form"));
      return;
    }
    const saveExpenseBtn = event.target.closest("[data-save-expense]");
    if (saveExpenseBtn) {
      saveExpense(saveExpenseBtn.closest("form"));
      return;
    }
    const saveSettingsBtn = event.target.closest("[data-save-settings]");
    if (saveSettingsBtn) {
      saveSettings(saveSettingsBtn.closest("form"));
      return;
    }
    const editCategory = event.target.closest("[data-edit-category]");
    if (editCategory) {
      fillCategoryForm(editCategory.dataset.editCategory);
      return;
    }
    const deleteCategory = event.target.closest("[data-delete-category]");
    if (deleteCategory) {
      deleteCategoryById(deleteCategory.dataset.deleteCategory);
      return;
    }
    const paid = event.target.closest("[data-order-paid]");
    if (paid) {
      markOrderPaid(paid.dataset.orderPaid);
      return;
    }
    const cancel = event.target.closest("[data-order-cancel]");
    if (cancel) {
      cancelOrder(cancel.dataset.orderCancel);
      return;
    }
    const deleteExpense = event.target.closest("[data-delete-expense]");
    if (deleteExpense) {
      state.expenses = state.expenses.filter((expense) => expense.id !== deleteExpense.dataset.deleteExpense);
      render();
      return;
    }
  });

  document.getElementById("searchInput").addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderShop();
  });

  document.getElementById("confirmAgeBtn").addEventListener("click", () => {
    state.session.adultConfirmed = true;
    render();
  });
  document.getElementById("leaveBtn").addEventListener("click", () => {
    document.querySelector(".age-panel").innerHTML = "<h1>Acesso encerrado</h1><p>Volte quando puder confirmar a maioridade.</p>";
  });

  document.getElementById("goCheckoutBtn").addEventListener("click", () => {
    if (state.cart.length) navigate("checkout");
  });
  document.getElementById("lookupCepBtn").addEventListener("click", lookupCep);
  document.getElementById("approvePixBtn").addEventListener("click", () => toast("PIX simulado como pago."));
  document.getElementById("copyOrderBtn").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(lastOrderText);
    toast("Resumo copiado.");
  });
  document.getElementById("sendWhatsappBtn").addEventListener("click", (event) => {
    const url = event.currentTarget.dataset.whatsappUrl;
    if (url) window.open(url, "_blank", "noopener");
  });

  document.body.addEventListener("input", (event) => {
    applyInputMask(event.target);
  });

  document.getElementById("checkoutForm").addEventListener("change", (event) => {
    if (event.target.name === "fulfillment") {
      document.getElementById("deliveryFields").classList.toggle("hidden", event.target.value !== "delivery");
      renderCart();
      renderCheckoutSummary();
    }
    if (event.target.name === "paymentMethod") {
      document.getElementById("pixSim").classList.toggle("active", event.target.value === "pix");
      document.getElementById("cardSim").classList.toggle("active", event.target.value === "card");
    }
  });

  document.getElementById("checkoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const order = createOrder(new FormData(event.target));
      event.target.reset();
      showSuccess(order);
    } catch (error) {
      toast(error.message);
    }
  });

  document.getElementById("adminLoginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (new FormData(event.target).get("password") === state.settings.adminPassword) {
      state.session.adminLogged = true;
      render();
    } else {
      toast("Senha incorreta.");
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    state.session.adminLogged = false;
    render();
  });

  document.body.addEventListener("change", (event) => {
    if (event.target.matches("[data-order-status]")) {
      const order = state.orders.find((entry) => entry.id === event.target.dataset.orderStatus);
      if (order) {
        order.status = event.target.value;
        if (event.target.value === "pago") order.paymentStatus = "paid";
        render();
      }
    }
  });
}

async function saveProduct(form) {
  if (!form) return;
  const data = new FormData(form);
  const image = await readImageAsDataUrl(data.get("image"));
  const id = data.get("id");
  const base = {
    sku: data.get("sku"),
    name: data.get("name"),
    description: data.get("description"),
    categoryId: data.get("categoryId"),
    costPrice: Number(data.get("costPrice")),
    salePrice: Number(data.get("salePrice")),
    stock: Number(data.get("stock")),
    minStock: Number(data.get("minStock") || 0),
    active: data.get("active") === "on",
    featured: data.get("featured") === "on",
    adultOnly: data.get("adultOnly") === "on",
    status: data.get("active") === "on" ? "active" : "inactive",
  };
  if (id) {
    const product = productById(id);
    Object.assign(product, base);
    if (image) product.image = image;
  } else {
    state.products.unshift({ id: uid("prod"), image, ...base });
  }
  form.reset();
  toast("Produto salvo.");
  render();
}

function fillProductForm(id) {
  const product = productById(id);
  const form = document.getElementById("productForm");
  if (!product || !form) return;
  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.sku.value = product.sku || "";
  form.elements.description.value = product.description || "";
  form.elements.categoryId.value = product.categoryId;
  form.elements.costPrice.value = product.costPrice;
  form.elements.salePrice.value = product.salePrice;
  form.elements.stock.value = product.stock;
  form.elements.minStock.value = product.minStock;
  form.elements.active.checked = product.active;
  form.elements.featured.checked = product.featured;
  form.elements.adultOnly.checked = product.adultOnly;
}

function deleteProductById(id) {
  state.products = state.products.filter((product) => product.id !== id);
  state.cart = state.cart.filter((item) => item.productId !== id);
  render();
}

function saveCategory(form) {
  if (!form) return;
  const data = new FormData(form);
  const id = data.get("id");
  if (id) {
    const category = state.categories.find((cat) => cat.id === id);
    category.name = data.get("name");
  } else {
    state.categories.push({ id: uid("cat"), name: data.get("name") });
  }
  form.reset();
  render();
}

function fillCategoryForm(id) {
  const category = state.categories.find((cat) => cat.id === id);
  const form = document.getElementById("categoryForm");
  if (!category || !form) return;
  form.id.value = category.id;
  form.name.value = category.name;
}

function deleteCategoryById(id) {
  if (state.products.some((product) => product.categoryId === id)) return toast("Categoria possui produtos vinculados.");
  state.categories = state.categories.filter((cat) => cat.id !== id);
  render();
}

function saveStockMove(form) {
  if (!form) return;
  const data = new FormData(form);
  const product = productById(data.get("productId"));
  const qty = Number(data.get("quantity"));
  const type = data.get("type");
  if (!product) return;
  product.stock += type === "entrada" ? qty : -qty;
  if (product.stock < 0) product.stock = 0;
  state.stockLog.push({ id: uid("stock"), date: new Date().toISOString(), productName: product.name, type, quantity: qty, reason: data.get("reason") });
  form.reset();
  render();
}

function saveExpense(form) {
  if (!form) return;
  const data = new FormData(form);
  state.expenses.unshift({
    id: uid("exp"),
    description: data.get("description"),
    amount: Number(data.get("amount")),
    dueDate: data.get("dueDate"),
    status: data.get("status"),
  });
  form.reset();
  render();
}

function saveSettings(form) {
  if (!form) return;
  const data = new FormData(form);
  state.settings.storeName = data.get("storeName");
  state.settings.whatsapp = data.get("whatsapp");
  state.settings.deliveryFee = Number(data.get("deliveryFee") || 0);
  state.settings.minimumDelivery = Number(data.get("minimumDelivery") || 0);
  state.settings.openForOrders = data.get("openForOrders") === "on";
  if (data.get("adminPassword")) state.settings.adminPassword = data.get("adminPassword");
  toast("Configuracoes salvas.");
  render();
}

function markOrderPaid(id) {
  const order = state.orders.find((entry) => entry.id === id);
  if (!order) return;
  order.paymentStatus = "paid";
  order.status = "pago";
  render();
}

function cancelOrder(id) {
  const order = state.orders.find((entry) => entry.id === id);
  if (!order || order.status === "cancelado") return;
  order.status = "cancelado";
  order.paymentStatus = "cancelado";
  order.items.forEach((item) => {
    const product = productById(item.productId);
    if (product) {
      product.stock += item.quantity;
      state.stockLog.push({ id: uid("stock"), date: new Date().toISOString(), productName: product.name, type: "entrada", quantity: item.quantity, reason: `Cancelamento ${order.number}` });
    }
  });
  render();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function applyInputMask(input) {
  if (!(input instanceof HTMLInputElement)) return;
  if (input.name === "cpf") input.value = maskCpf(input.value);
  if (input.name === "phone" || input.name === "whatsapp") input.value = maskPhone(input.value);
  if (input.name === "cep") input.value = onlyDigits(input.value).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  if (input.name === "cardNumber") input.value = onlyDigits(input.value).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  if (input.name === "cardExpiry") input.value = onlyDigits(input.value).slice(0, 4).replace(/(\d{2})(\d)/, "$1/$2");
  if (input.name === "cardCvv") input.value = onlyDigits(input.value).slice(0, 4);
  if (input.name === "state") input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
}

function maskCpf(value) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

bindEvents();
render();
