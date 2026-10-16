// Nina Weaves — Client Cart & WhatsApp Ordering Manager
const CART_STORAGE_KEY = 'nina_weaves_cart_v1';

const NinaCart = {
  getItems() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse cart:', e);
      return [];
    }
  },

  saveItems(items) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      this.updateBadge();
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  },

  addItem(item) {
    const items = this.getItems();
    // Unique key: productId + variationId
    const key = `${item.productId}-${item.variationId || 'base'}`;
    const existing = items.find(i => `${i.productId}-${i.variationId || 'base'}` === key);

    if (existing) {
      existing.quantity = Math.min((existing.quantity || 1) + (item.quantity || 1), item.maxStock || 99);
    } else {
      items.push({
        key,
        productId: item.productId,
        variationId: item.variationId || null,
        productName: item.productName,
        sku: item.sku,
        size: item.size || null,
        quality: item.quality || 'Standard',
        unit: item.unit || 'piece',
        unitPrice: parseFloat(item.unitPrice),
        image: item.image,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        maxStock: item.maxStock || 99
      });
    }

    this.saveItems(items);
    this.showToast(`Added "${item.productName}" to your bag`, 'success');
  },

  updateQuantity(key, newQty) {
    let items = this.getItems();
    const item = items.find(i => i.key === key);
    if (!item) return;

    const qty = parseInt(newQty, 10);
    if (qty <= 0) {
      this.removeItem(key);
      return;
    }

    item.quantity = Math.min(qty, item.maxStock || 99);
    this.saveItems(items);
  },

  removeItem(key) {
    let items = this.getItems().filter(i => i.key !== key);
    this.saveItems(items);
    this.showToast('Item removed from bag', 'info');
  },

  clear() {
    localStorage.removeItem(CART_STORAGE_KEY);
    this.updateBadge();
  },

  getCount() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  },

  getSubtotal() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + (item.unitPrice * (item.quantity || 1)), 0);
  },

  updateBadge() {
    const badges = document.querySelectorAll('.cart-count-badge');
    const count = this.getCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Initialize badges on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  NinaCart.updateBadge();

  // If on Cart page, render items
  const cartContainer = document.getElementById('cart-items-container');
  if (cartContainer) {
    renderCartPage();
  }
});

function renderCartPage() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const checkoutBox = document.getElementById('checkout-sidebar');
  const subtotalElem = document.getElementById('cart-subtotal-val');
  const totalElem = document.getElementById('cart-total-val');
  const items = NinaCart.getItems();

  if (items.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (container) container.style.display = 'none';
    if (checkoutBox) checkoutBox.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (container) container.style.display = 'block';
  if (checkoutBox) checkoutBox.style.display = 'block';

  let html = '';
  items.forEach(item => {
    const itemSubtotal = item.unitPrice * item.quantity;
    html += `
      <div class="cart-item" data-key="${item.key}">
        <img src="${item.image || '/images/hero-banner.svg'}" alt="${item.productName}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.productName}</div>
          <div class="cart-item-meta">
            ${item.size ? `<span>Size: <strong>${item.size}</strong></span> • ` : ''}
            <span>Quality: <strong>${item.quality}</strong></span>
            <div><small style="color:#8C8377">SKU: ${item.sku}</small></div>
          </div>
          <div class="cart-item-footer">
            <div class="qty-control">
              <button type="button" class="qty-btn" onclick="NinaCart.updateQuantity('${item.key}', ${item.quantity - 1}); renderCartPage();">−</button>
              <input type="text" class="qty-input" value="${item.quantity}" readonly>
              <button type="button" class="qty-btn" onclick="NinaCart.updateQuantity('${item.key}', ${item.quantity + 1}); renderCartPage();">+</button>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; font-size: 1.05rem;">₹${itemSubtotal.toLocaleString('en-IN')}</div>
              <button type="button" class="cart-remove-btn" onclick="NinaCart.removeItem('${item.key}'); renderCartPage();">Remove</button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  const subtotal = NinaCart.getSubtotal();
  if (subtotalElem) subtotalElem.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (totalElem) totalElem.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
}

// WhatsApp Checkout Form Handler
async function handleWhatsAppCheckout(event) {
  event.preventDefault();
  const btn = document.getElementById('whatsapp-submit-btn');
  const errorBox = document.getElementById('checkout-error-box');
  const form = event.target;

  const name = form.customerName.value.trim();
  const phone = form.customerPhone.value.trim();
  const email = form.customerEmail.value.trim();
  const address = form.deliveryAddress.value.trim();
  const notes = form.notes.value.trim();

  if (!name || !phone) {
    if (errorBox) {
      errorBox.textContent = 'Please enter your name and WhatsApp contact number.';
      errorBox.style.display = 'block';
    }
    return;
  }

  const items = NinaCart.getItems();
  if (items.length === 0) {
    alert('Your bag is empty.');
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> Preparing WhatsApp Inquiry...`;
    if (errorBox) errorBox.style.display = 'none';

    const response = await fetch('/api/checkout/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        deliveryAddress: address,
        notes,
        items
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to initialize WhatsApp consultation.');
    }

    // Clear cart
    NinaCart.clear();

    // Show order success confirmation in UI
    const cartWrapper = document.getElementById('cart-main-wrapper');
    if (cartWrapper) {
      cartWrapper.innerHTML = `
        <div style="background:#FFF; border:1px solid #CFC5B8; border-radius:12px; padding:3.5rem 2rem; text-align:center; max-width:680px; margin:2rem auto; box-shadow:0 8px 30px rgba(0,0,0,0.06);">
          <div style="width:64px; height:64px; background:#E8F5E9; color:#2E7D32; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:2rem; margin-bottom:1.5rem;">✓</div>
          <h2 style="font-family:'Cormorant Garamond', serif; font-size:2.2rem; margin-bottom:0.75rem;">Order Inquiry Initiated</h2>
          <p style="color:#6B635B; font-size:1.05rem; margin-bottom:1.5rem;">
            Your inquiry reference is <strong style="color:#1C1917; font-size:1.15rem; letter-spacing:0.05em;">${data.orderReference}</strong>.
          </p>
          <div style="background:#FAF8F5; border:1px dashed #C5A880; border-radius:8px; padding:1.25rem; margin-bottom:2rem; text-align:left; font-size:0.9rem; color:#4A443E;">
            <p><strong>Next Steps:</strong></p>
            <p style="margin-top:0.35rem;">WhatsApp has opened with your inquiry pre-filled. Our atelier team will review fabric specifications and confirm order dispatch.</p>
            <p style="margin-top:0.35rem; font-size:0.8rem; color:#8C8377;">(Note: Stock is reserved upon formal consultation confirmation by our team).</p>
          </div>
          <div style="display:flex; flex-direction:column; gap:1rem; align-items:center;">
            <a href="${data.whatsappUrl}" target="_blank" class="btn btn-whatsapp btn-lg">
              Open WhatsApp Chat Again
            </a>
            <a href="/shop" class="btn btn-outline">
              Continue Browsing Atelier
            </a>
          </div>
        </div>
      `;
    }

    // Open WhatsApp in a new window/tab
    window.open(data.whatsappUrl, '_blank');

  } catch (err) {
    console.error('WhatsApp checkout error:', err);
    if (errorBox) {
      errorBox.textContent = err.message || 'Error creating WhatsApp inquiry.';
      errorBox.style.display = 'block';
    }
    btn.disabled = false;
    btn.innerHTML = `Order on WhatsApp`;
  }
}
