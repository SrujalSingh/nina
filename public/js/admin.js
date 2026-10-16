// Nina Weaves — Admin Portal Interactivity

// Modal controls
function openStockModal(varId, sku, currentStock, productName) {
  const modal = document.getElementById('stock-adjust-modal');
  if (!modal) return;

  document.getElementById('modal-var-id').value = varId;
  document.getElementById('modal-var-sku').textContent = sku;
  document.getElementById('modal-product-name').textContent = productName;
  document.getElementById('modal-current-stock').textContent = currentStock;
  document.getElementById('modal-qty-input').value = '1';

  modal.style.display = 'flex';
}

function closeStockModal() {
  const modal = document.getElementById('stock-adjust-modal');
  if (modal) modal.style.display = 'none';
}

// Add Dynamic Variation Row in Product Form
function addVariationRow(type = 'shirt') {
  const container = document.getElementById('variations-table-body');
  if (!container) return;

  const rowCount = container.children.length + 1;
  const tr = document.createElement('tr');

  if (type === 'shirt') {
    tr.innerHTML = `
      <td><input type="text" name="var_sku" class="admin-input" placeholder="e.g. SHT-001-${rowCount}" style="padding:0.4rem;"></td>
      <td>
        <select name="var_size" class="admin-select" style="padding:0.4rem;">
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M" selected>M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
          <option value="Custom Size">Custom Size</option>
        </select>
      </td>
      <td><input type="text" name="var_quality" class="admin-input" value="Standard Giza Cotton" style="padding:0.4rem;"></td>
      <td><input type="hidden" name="var_option" value=""><span style="color:#94A3B8;">—</span></td>
      <td><input type="number" name="var_price" class="admin-input" placeholder="Leave empty for base price" style="padding:0.4rem;"></td>
      <td><input type="number" name="var_stock" class="admin-input" value="10" min="0" style="padding:0.4rem; width:80px;"></td>
      <td><button type="button" class="admin-btn admin-btn-danger admin-btn-sm" onclick="this.closest('tr').remove();">×</button></td>
    `;
  } else {
    // Fabric sample
    tr.innerHTML = `
      <td><input type="text" name="var_sku" class="admin-input" placeholder="e.g. FAB-001-${rowCount}" style="padding:0.4rem;"></td>
      <td><input type="hidden" name="var_size" value=""><span style="color:#94A3B8;">—</span></td>
      <td><input type="text" name="var_quality" class="admin-input" value="100% Linen" style="padding:0.4rem;"></td>
      <td><input type="text" name="var_option" class="admin-input" value="Swatch Card (15x15 cm)" style="padding:0.4rem;"></td>
      <td><input type="number" name="var_price" class="admin-input" placeholder="Price" style="padding:0.4rem;"></td>
      <td><input type="number" name="var_stock" class="admin-input" value="25" min="0" style="padding:0.4rem; width:80px;"></td>
      <td><button type="button" class="admin-btn admin-btn-danger admin-btn-sm" onclick="this.closest('tr').remove();">×</button></td>
    `;
  }

  container.appendChild(tr);
}

// Close modal on click outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('stock-adjust-modal');
  if (e.target === modal) {
    closeStockModal();
  }
});
