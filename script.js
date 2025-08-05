// Configuração do Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dnl9vuqdi'; // Substitua pelo seu cloud name
const CLOUDINARY_UPLOAD_PRESET = 'produtos_present'; // Substitua pelo seu upload preset
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_RAW_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
const CLOUDINARY_FETCH_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/raw/upload/produtos-loja.json`;

// Verificar se Cloudinary está configurado
const isCloudinaryConfigured = () => {
  return CLOUDINARY_CLOUD_NAME !== 'SEU_CLOUD_NAME' && CLOUDINARY_UPLOAD_PRESET !== 'SEU_UPLOAD_PRESET';
};

// Função para salvar produtos no Cloudinary
async function saveProductsToCloudinary(products) {
  try {
    const jsonFile = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    
    const formData = new FormData();
    formData.append('file', jsonFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('public_id', 'produtos-loja');
    formData.append('resource_type', 'raw');
    
    const response = await fetch(CLOUDINARY_RAW_URL, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      console.log('Produtos sincronizados com Cloudinary!');
      return true;
    }
  } catch (error) {
    console.error('Erro ao sincronizar com Cloudinary:', error);
  }
  return false;
}

// Função para carregar produtos do Cloudinary
async function loadProductsFromCloudinary() {
  try {
    const response = await fetch(CLOUDINARY_FETCH_URL + '?t=' + Date.now()); // Cache bust
    if (response.ok) {
      const products = await response.json();
      return products;
    }
  } catch (error) {
    console.log('Produtos ainda não sincronizados no Cloudinary, usando localStorage');
  }
  return null;
}

// Utilidades para localStorage (com sincronização Cloudinary)
function getProducts() {
  return JSON.parse(localStorage.getItem('products') || '[]');
}

async function saveProducts(products) {
  // Salva local primeiro (backup)
  localStorage.setItem('products', JSON.stringify(products));
  
  // Sincroniza com Cloudinary
  await saveProductsToCloudinary(products);
}

// Função para carregar produtos (prioriza Cloudinary)
async function loadProducts() {
  const cloudinaryProducts = await loadProductsFromCloudinary();
  if (cloudinaryProducts) {
    // Se encontrou no Cloudinary, atualiza localStorage
    localStorage.setItem('products', JSON.stringify(cloudinaryProducts));
    return cloudinaryProducts;
  }
  // Se não encontrou no Cloudinary, usa localStorage
  return getProducts();
}

// Renderização da tabela
async function renderProducts() {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Carregando produtos...</td></tr>';
  
  const products = await loadProducts();
  tbody.innerHTML = '';
  
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #888;">Nenhum produto cadastrado</td></tr>';
    return;
  }
  
  products.forEach((prod, idx) => {
    const tr = document.createElement('tr');
    const discount = prod.discount || 0;
    const discountText = discount > 0 ? 
      `<div class='discount-info'>
          <span class='discount-percent'><i class="fas fa-percentage"></i> ${discount}%</span>
          <span class='final-price'>R$ ${(prod.price * (1 - discount/100)).toFixed(2)}</span>
        </div>` : '-';
    
    // Aplicar cor amarela se há desconto
    if (discount > 0) {
      tr.style.backgroundColor = '#fff3cd';
      tr.style.borderLeft = '4px solid #ffc107';
    }
    
    // Aplicar efeito especial se há promoção
    if (prod.promo && prod.promo.percent > 0) {
      tr.style.background = 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)';
      tr.style.borderLeft = '4px solid #ffc107';
      tr.style.boxShadow = '0 4px 15px rgba(255, 193, 7, 0.2)';
      tr.style.animation = 'promoGlow 3s ease-in-out infinite';
      tr.classList.add('promo-row');
    }
    
    const priceDisplay = prod.promo && prod.promo.percent > 0 ? 
      `<div class='price-container'>
        <span class='original-price'>R$ ${Number(prod.price).toFixed(2)}</span>
        <span class='promo-price'>R$ ${(prod.price*(1-prod.promo.percent/100)).toFixed(2)}</span>
        <span class='savings'>Economize R$ ${(prod.price * prod.promo.percent / 100).toFixed(2)}</span>
      </div>` : 
      `R$ ${Number(prod.price).toFixed(2)}`;
    
    tr.innerHTML = `
      <td><img src="${prod.image}" alt="${prod.name}" class="product-img"></td>
      <td>${prod.name}</td>
      <td>${prod.desc}</td>
      <td>${prod.category}</td>
      <td>${priceDisplay}</td>
      <td class="discount-cell">${discountText}</td>
      <td>
        <button class='action-btn edit' title='Editar' onclick='editProduct(${idx})'><i class='fa fa-edit'></i></button>
        <button class='action-btn delete' title='Excluir' onclick='deleteProduct(${idx})'><i class='fa fa-trash'></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Adicionar ou editar produto
const form = document.getElementById('product-form');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Função para fazer upload para Cloudinary
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Erro no upload da imagem');
    }
    
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw error;
  }
}

function getImageInputValue() {
  const urlInput = document.getElementById('product-image-url');
  const fileInput = document.getElementById('product-image-file');
  
  if (fileInput.files && fileInput.files[0]) {
    // Verificar se Cloudinary está configurado
    if (isCloudinaryConfigured()) {
      // Se configurado, faz upload para Cloudinary
      return uploadToCloudinary(fileInput.files[0]);
    } else {
      // Se não configurado, usa base64 (modo compatibilidade)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileInput.files[0]);
      });
    }
  } else if (urlInput.value.trim() !== '') {
    // Se há uma URL, usa diretamente
    return Promise.resolve(urlInput.value.trim());
  } else {
    // Retorna null explicitamente para facilitar a validação
    return Promise.resolve(null);
  }
}

form.onsubmit = async function(e) {
  e.preventDefault();
  
  // Validação inicial
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const desc = document.getElementById('product-desc').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const discount = parseFloat(document.getElementById('product-discount').value) || 0;
  const category = document.getElementById('product-category').value.trim();
  
  if(!name || !desc || !category || isNaN(price) || price < 0) {
    Swal.fire('Preencha todos os campos corretamente!','', 'warning');
    return;
  }
  
  // Verificar se há imagem
  const urlInput = document.getElementById('product-image-url');
  const fileInput = document.getElementById('product-image-file');
  if (!fileInput.files[0] && !urlInput.value.trim()) {
    Swal.fire('Adicione uma imagem (arquivo ou URL)!','', 'warning');
    return;
  }
  
  // Mostrar loading
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Processando...';
  saveBtn.disabled = true;
  
  try {
     const image = await getImageInputValue();
     
     // Mostrar aviso se usando modo compatibilidade
     if (!isCloudinaryConfigured() && fileInput.files[0]) {
       console.warn('⚠️ Cloudinary não configurado. Usando armazenamento local (limitado).');
     }
     
     let products = getProducts();
     if(id) {
       products[id] = {...products[id], name, desc, price, discount, image, category};
       Swal.fire('Produto atualizado e sincronizado!','', 'success');
     } else {
       products.push({name, desc, price, discount, image, category});
       Swal.fire('Produto adicionado e sincronizado!','', 'success');
     }
     
     // Salva e sincroniza com Cloudinary
     await saveProducts(products);
     
     form.reset();
     document.getElementById('product-image-file').value = '';
     document.getElementById('product-image-url').value = '';
     document.getElementById('product-id').value = '';
     saveBtn.textContent = 'Adicionar Produto';
     cancelBtn.style.display = 'none';
     
     // Recarrega a tabela
     await renderProducts();
   } catch (error) {
     console.error('Erro ao salvar produto:', error);
     if (error.message.includes('Cloudinary') || error.message.includes('upload')) {
       Swal.fire('Erro no Cloudinary!', 'Configure suas credenciais no arquivo script.js. Consulte CLOUDINARY_SETUP.md', 'error');
     } else {
       Swal.fire('Erro ao salvar produto!', 'Tente novamente.', 'error');
     }
   } finally {
     saveBtn.textContent = originalText;
     saveBtn.disabled = false;
   }
};

cancelBtn.onclick = function() {
  form.reset();
  document.getElementById('product-id').value = '';
  saveBtn.textContent = 'Adicionar Produto';
  cancelBtn.style.display = 'none';
};

window.editProduct = function(idx) {
  const products = getProducts();
  const prod = products[idx];
  document.getElementById('product-id').value = idx;
  document.getElementById('product-name').value = prod.name;
  document.getElementById('product-desc').value = prod.desc;
  document.getElementById('product-price').value = prod.price;
  document.getElementById('product-discount').value = prod.discount || 0;
  document.getElementById('product-image-url').value = prod.image.startsWith('data:') ? '' : prod.image;
  document.getElementById('product-image-file').value = '';
  document.getElementById('product-category').value = prod.category;
  saveBtn.textContent = 'Salvar Alterações';
  cancelBtn.style.display = 'inline-block';
};

window.deleteProduct = async function(idx) {
  const result = await Swal.fire({
    title: 'Tem certeza?',
    text: 'Esta ação não pode ser desfeita!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#2563eb',
    confirmButtonText: 'Sim, excluir!',
    cancelButtonText: 'Cancelar'
  });
  
  if (result.isConfirmed) {
    let products = getProducts();
    products.splice(idx, 1);
    await saveProducts(products);
    await renderProducts();
    Swal.fire('Excluído!', 'Produto removido e sincronizado.', 'success');
  }
};



// Função para exportar produtos para JSON
function exportProducts() {
  const products = getProducts();
  
  if (products.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Nenhum produto encontrado',
      text: 'Adicione alguns produtos antes de exportar.'
    });
    return;
  }

  // Criar arquivo JSON
  const dataStr = JSON.stringify(products, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  // Criar link de download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = 'produtos-loja.json';
  
  // Fazer download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Mostrar mensagem de sucesso
  Swal.fire({
    icon: 'success',
    title: 'Produtos exportados!',
    text: `${products.length} produto(s) exportado(s) com sucesso.`,
    timer: 2000,
    showConfirmButton: false
  });
}

// Event listener para o botão de exportar
document.addEventListener('DOMContentLoaded', function() {
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportProducts);
  }
});

window.onload = async function() {
  await renderProducts();
};
window.debugListProducts = function() {
  alert(JSON.stringify(getProducts(), null, 2));
};