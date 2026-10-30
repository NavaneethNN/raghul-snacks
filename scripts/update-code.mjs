import fs from 'fs';

// 1. Update components/admin-table.module.css
let tableCss = fs.readFileSync('components/admin-table.module.css', 'utf8');

const toolbarTopMarker = `.toolbarTop {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}`;

const toolbarTopReplacement = `.toolbarTop {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.toolbarRow {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

@media (max-width: 640px) {
  .toolbarRow {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}

.filterDropdownWrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  min-width: 200px;
}

@media (max-width: 640px) {
  .filterDropdownWrap {
    width: 100%;
  }
}

.filterDropdownIcon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
  display: flex;
  align-items: center;
}

.filterDropdown {
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  border: 1.5px solid var(--line);
  background: var(--paper);
  padding: 9px 32px 9px 34px;
  font: 600 13px 'DM Sans', sans-serif;
  color: var(--ink);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  box-sizing: border-box;
}

.filterDropdown:focus {
  outline: none;
  border-color: var(--terracotta);
  background: white;
  box-shadow: 0 0 0 3px rgba(201, 95, 59, 0.1);
}

.filterCount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 11px;
  margin-left: 6px;
  font-family: 'DM Mono', monospace;
  font-weight: 700;
}

.activeFilter .filterCount {
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
}`;

tableCss = tableCss.replace(toolbarTopMarker, toolbarTopReplacement);

// Make .filters scrollable horizontally without wrapping or breaking
const oldFilters = `.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filters button {
  border: 1.5px solid var(--line);
  background: var(--paper);
  padding: 8px 16px;
  color: var(--ink);
  font: 600 13px 'DM Sans', sans-serif;
  text-transform: capitalize;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}`;

const newFilters = `.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.filters::-webkit-scrollbar {
  display: none;
}

.filters button {
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  border: 1.5px solid var(--line);
  background: var(--paper);
  padding: 7px 14px;
  color: var(--ink);
  font: 600 13px 'DM Sans', sans-serif;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}`;

tableCss = tableCss.replace(oldFilters, newFilters);
fs.writeFileSync('components/admin-table.module.css', tableCss, 'utf8');
console.log('Updated components/admin-table.module.css successfully!');

// 2. Update components/admin-products.tsx toolbar and stats
let prodTsx = fs.readFileSync('components/admin-products.tsx', 'utf8');

// Update stats grid
const oldStats = `      {/* Stat banners — match dashboard metric card style */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, padding: "clamp(12px, 4vw, 24px) clamp(12px, 4vw, 32px) 8px" }}>
        {[
          { label: "Total Products", value: products.length },
          { label: "Active", value: products.filter(p => p.active !== false && p.stock !== 0).length },
          { label: "Out of Stock", value: products.filter(p => p.active === false || p.stock === 0).length },
          { label: "With Variants", value: products.filter(p => (p.variantCount ?? 0) > 0).length },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "18px 20px" }}>
            <span style={{ display: "block", color: "#6b7280", font: "600 10px 'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{stat.label}</span>
            <strong style={{ display: "block", margin: "8px 0 4px", fontSize: 28, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>{stat.value}</strong>
          </div>
        ))}
      </div>`;

const newStats = `      {/* Stat banners */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, padding: "clamp(12px, 3vw, 24px) clamp(12px, 3vw, 32px) 8px" }}>
        {[
          { label: "Total Products", value: products.length },
          { label: "Active", value: products.filter(p => p.active !== false && p.stock !== 0).length },
          { label: "Combos", value: products.filter(p => (p.categoryName || '').toLowerCase() === 'combos').length },
          { label: "Out of Stock", value: products.filter(p => p.active === false || p.stock === 0).length },
          { label: "With Variants", value: products.filter(p => (p.variantCount ?? 0) > 0).length },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px" }}>
            <span style={{ display: "block", color: "#6b7280", font: "600 10px 'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{stat.label}</span>
            <strong style={{ display: "block", margin: "6px 0 2px", fontSize: 24, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>{stat.value}</strong>
          </div>
        ))}
      </div>`;

prodTsx = prodTsx.replace(oldStats, newStats);

// Update toolbar in admin-products.tsx
const oldToolbar = `        <div className={styles.toolbar} style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div className={styles.toolbarSearch} style={{ flex: "1 1 240px" }}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input type="text" placeholder="Search products…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: "36px" }} />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: "8px", background: "#fff", fontSize: "13px", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}
          >
            <option value="">All Categories ({products.length})</option>
            <option value="combos"> Combos ({products.filter(p => (p.categoryName || '').toLowerCase() === 'combos').length})</option>
            {categories.filter(c => c.slug !== 'combos').map(c => (
              <option key={c.id} value={c.name}>{c.name} ({products.filter(p => p.categoryId === c.id).length})</option>
            ))}
          </select>
        </div>`;

const newToolbar = `        <div className={styles.toolbar}>
          {/* Top row: search + category dropdown */}
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarSearch}>
              <span className={styles.searchIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search products by name or category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.filterDropdownWrap}>
              <span className={styles.filterDropdownIcon}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </span>
              <select
                className={styles.filterDropdown}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter products by category"
              >
                <option value="">All Categories ({products.length})</option>
                <option value="combos"> Combos ({products.filter(p => (p.categoryName || '').toLowerCase() === 'combos').length})</option>
                {categories.filter(c => c.slug !== 'combos').map((c) => (
                  <option key={c.id} value={c.name}>{c.name} ({products.filter(p => p.categoryId === c.id).length})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Pill Buttons */}
          <div className={styles.filters}>
            <button
              type="button"
              className={categoryFilter === "" ? styles.activeFilter : ""}
              onClick={() => setCategoryFilter("")}
            >
              All Products
              <span className={styles.filterCount}>{products.length}</span>
            </button>
            <button
              type="button"
              className={categoryFilter === "combos" ? styles.activeFilter : ""}
              onClick={() => setCategoryFilter(categoryFilter === "combos" ? "" : "combos")}
            >
               Combos
              <span className={styles.filterCount}>{products.filter(p => (p.categoryName || '').toLowerCase() === 'combos').length}</span>
            </button>
            {categories.filter(c => c.slug !== 'combos').map((cat) => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              const isActive = categoryFilter.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={isActive ? styles.activeFilter : ""}
                  onClick={() => setCategoryFilter(isActive ? "" : cat.name)}
                >
                  {cat.name}
                  <span className={styles.filterCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>`;

prodTsx = prodTsx.replace(oldToolbar, newToolbar);
fs.writeFileSync('components/admin-products.tsx', prodTsx, 'utf8');
console.log('Updated components/admin-products.tsx successfully!');
