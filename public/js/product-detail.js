// Nina Weaves — Product Detail Interactive Gallery & Variation Controller

document.addEventListener('DOMContentLoaded', () => {
  // 1. Gallery Thumbnail Interaction
  const mainImg = document.getElementById('main-gallery-img');
  const thumbs = document.querySelectorAll('.thumb-item');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const newSrc = thumb.getAttribute('data-img-src');
      if (mainImg && newSrc) {
        mainImg.src = newSrc;
      }
    });
  });

  // 2. Variations Handling
  const productDataElement = document.getElementById('product-json-data');
  if (!productDataElement) return;

  const product = JSON.parse(productDataElement.textContent);
  const variations = product.variations || [];

  let selectedSize = null;
  let selectedQuality = null;

  const sizeBtns = document.querySelectorAll('.size-option-btn');
  const qualityCards = document.querySelectorAll('.quality-card-option');
  const priceDisplay = document.getElementById('detail-price-display');
  const skuDisplay = document.getElementById('detail-sku-display');
  const stockIndicator = document.getElementById('detail-stock-indicator');
  const stockBadgeText = document.getElementById('stock-badge-text');
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const directWhatsappBtn = document.getElementById('direct-whatsapp-btn');
  const qtyInput = document.getElementById('detail-qty-input');
  const qtyMinus = document.getElementById('detail-qty-minus');
  const qtyPlus = document.getElementById('detail-qty-plus');

  // Pre-select first available variation
  const defaultVar = variations.find(v => v.stock_quantity > 0) || variations[0];
  if (defaultVar) {
    selectedSize = defaultVar.size || null;
    selectedQuality = defaultVar.quality;
  }

  // Bind Size Buttons
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.getAttribute('data-size');
      updateVariationState();
    });
  });

  // Bind Quality Cards
  qualityCards.forEach(card => {
    card.addEventListener('click', () => {
      qualityCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedQuality = card.getAttribute('data-quality');
      updateVariationState();
    });
  });

  // Quantity Controls
  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });

    qtyPlus.addEventListener('click', () => {
      let val = parseInt(qtyInput.value, 10) || 1;
      const currentVar = getSelectedVariation();
      const max = currentVar ? currentVar.stock_quantity : 99;
      if (val < max) qtyInput.value = val + 1;
    });
  }

  function getSelectedVariation() {
    if (variations.length === 0) return null;

    // For shirts (has size)
    if (selectedSize) {
      return variations.find(v => v.size === selectedSize && (!selectedQuality || v.quality === selectedQuality)) ||
             variations.find(v => v.size === selectedSize) ||
             variations[0];
    }

    // For fabric samples (by quality or option)
    if (selectedQuality) {
      return variations.find(v => v.quality === selectedQuality) || variations[0];
    }

    return variations[0];
  }

  function updateVariationState() {
    const activeVar = getSelectedVariation();
    if (!activeVar) return;

    // Price
    const effectivePrice = activeVar.price || product.sale_price || product.base_price;
    if (priceDisplay) {
      priceDisplay.textContent = `₹${parseFloat(effectivePrice).toLocaleString('en-IN')}`;
    }

    // SKU
    if (skuDisplay) {
      skuDisplay.textContent = activeVar.sku;
    }

    // Stock availability
    const stock = activeVar.stock_quantity;
    if (stockIndicator && stockBadgeText) {
      stockIndicator.className = 'stock-indicator-bar';
      if (stock === 0) {
        stockIndicator.classList.add('stock-out');
        stockBadgeText.textContent = 'Sold Out';
        if (addToCartBtn) {
          addToCartBtn.disabled = true;
          addToCartBtn.textContent = 'Variation Sold Out';
          addToCartBtn.classList.add('btn-disabled');
        }
      } else if (stock <= product.low_stock_threshold) {
        stockIndicator.classList.add('stock-low');
        stockBadgeText.textContent = `Only ${stock} unit(s) remaining — Order soon`;
        if (addToCartBtn) {
          addToCartBtn.disabled = false;
          addToCartBtn.textContent = 'Add to Shopping Bag';
          addToCartBtn.classList.remove('btn-disabled');
        }
      } else {
        stockIndicator.classList.add('stock-in');
        stockBadgeText.textContent = `In Stock (${stock} available)`;
        if (addToCartBtn) {
          addToCartBtn.disabled = false;
          addToCartBtn.textContent = 'Add to Shopping Bag';
          addToCartBtn.classList.remove('btn-disabled');
        }
      }
    }

    // Adjust qty input maximum
    if (qtyInput) {
      const currentVal = parseInt(qtyInput.value, 10) || 1;
      if (stock > 0 && currentVal > stock) {
        qtyInput.value = stock;
      }
    }

    // Update Direct WhatsApp button link
    if (directWhatsappBtn) {
      const bizNumber = window.NINA_WHATSAPP_NUMBER || '919876543210';
      const text = encodeURIComponent(
        `Hello Atelier Nina Weaves, I am interested in *${product.name}* (SKU: ${activeVar.sku})\n` +
        `• Size/Option: ${activeVar.size || activeVar.option_name || 'Standard'}\n` +
        `• Quality: ${activeVar.quality}\n` +
        `• Price: ₹${effectivePrice}\n` +
        `Could you please assist me with sizing and availability?`
      );
      directWhatsappBtn.href = `https://wa.me/${bizNumber}?text=${text}`;
    }
  }

  // Initial trigger
  updateVariationState();

  // Add to Bag Button
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const activeVar = getSelectedVariation();
      if (!activeVar || activeVar.stock_quantity === 0) return;

      const qty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;
      const unitPrice = activeVar.price || product.sale_price || product.base_price;

      NinaCart.addItem({
        productId: product.id,
        variationId: activeVar.id,
        productName: product.name,
        sku: activeVar.sku,
        size: activeVar.size,
        quality: activeVar.quality,
        unit: product.unit || 'piece',
        unitPrice: unitPrice,
        image: product.images && product.images.length > 0 ? product.images[0].image_url : null,
        quantity: qty,
        maxStock: activeVar.stock_quantity
      });
    });
  }
});
