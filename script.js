// Configuração do Cloudinary
const CLOUDINARY_CLOUD_NAME = 'SEU_CLOUD_NAME'; // Substitua pelo seu cloud name
const CLOUDINARY_UPLOAD_PRESET = 'SEU_UPLOAD_PRESET'; // Substitua pelo seu upload preset
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Utilidades para localStorage
function getProducts() {
  return JSON.parse(localStorage.getItem('products') || '[]');
}
function saveProducts(products) {
  localStorage.setItem('products', JSON.stringify(products));
}

// Renderização da tabela
function renderProducts() {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '';
  const products = getProducts();
  products.forEach((prod, idx) => {
    const tr = document.createElement('tr');
    if(prod.promo && prod.promo.percent > 0) tr.classList.add('promo-row');
    tr.innerHTML = `
      <td><img src="${prod.image}" alt="${prod.name}" class="product-img"></td>
      <td>${prod.name}</td>
      <td>${prod.desc}</td>
      <td>${prod.category}</td>
      <td>
        R$ ${prod.promo && prod.promo.percent > 0 ? `<span style='text-decoration:line-through;color:#888'>${Number(prod.price).toFixed(2)}</span> <span style='color:#eab308;font-weight:700'>${(prod.price*(1-prod.promo.percent/100)).toFixed(2)}</span>` : Number(prod.price).toFixed(2)}
      </td>
      <td>
        ${prod.promo && prod.promo.percent > 0 ? `<span class='promo-badge'><i class='fa fa-tag'></i> -${prod.promo.percent}%</span>` : `<button class='action-btn promo' title='Aplicar promoção' onclick='openPromoModal(${idx})'><i class='fa fa-percent'></i></button>`}
      </td>
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
    // Se há um arquivo, faz upload para Cloudinary
    return uploadToCloudinary(fileInput.files[0]);
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
    
    let products = getProducts();
    if(id) {
      products[id] = {...products[id], name, desc, price, image, category};
      Swal.fire('Produto atualizado!','', 'success');
    } else {
      products.push({name, desc, price, image, category, promo:{percent:0}});
      Swal.fire('Produto adicionado!','', 'success');
    }
    saveProducts(products);
    form.reset();
    document.getElementById('product-image-file').value = '';
    document.getElementById('product-image-url').value = '';
    document.getElementById('product-id').value = '';
    saveBtn.textContent = 'Adicionar Produto';
    cancelBtn.style.display = 'none';
    renderProducts();
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
    Swal.fire('Erro ao fazer upload da imagem!', 'Verifique sua conexão e tente novamente.', 'error');
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
  document.getElementById('product-image-url').value = prod.image.startsWith('data:') ? '' : prod.image;
  document.getElementById('product-image-file').value = '';
  document.getElementById('product-category').value = prod.category;
  saveBtn.textContent = 'Salvar Alterações';
  cancelBtn.style.display = 'inline-block';
};

window.deleteProduct = function(idx) {
  Swal.fire({
    title: 'Tem certeza?',
    text: 'Esta ação não pode ser desfeita!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e11d48',
    cancelButtonColor: '#2563eb',
    confirmButtonText: 'Sim, excluir!'
  }).then((result) => {
    if(result.isConfirmed) {
      let products = getProducts();
      products.splice(idx,1);
      saveProducts(products);
      renderProducts();
      Swal.fire('Excluído!','Produto removido.','success');
    }
  });
};

const promoModal = document.getElementById('promo-modal');
const promoPercent = document.getElementById('promo-percent');
const applyPromoBtn = document.getElementById('apply-promo-btn');
let promoIdx = null;
window.openPromoModal = function(idx) {
  promoIdx = idx;
  promoPercent.value = '';
  promoModal.style.display = 'block';
};
document.querySelector('.close').onclick = function() {
  promoModal.style.display = 'none';
};
window.onclick = function(event) {
  if(event.target == promoModal) promoModal.style.display = 'none';
};
applyPromoBtn.onclick = function() {
  const percent = parseInt(promoPercent.value);
  if(isNaN(percent) || percent < 1 || percent > 99) {
    Swal.fire('Informe um percentual válido (1-99)!','','warning');
    return;
  }
  let products = getProducts();
  products[promoIdx].promo = {percent};
  saveProducts(products);
  promoModal.style.display = 'none';
  renderProducts();
  Swal.fire('Promoção aplicada!','','success');
};

window.onload = function() {
  renderProducts();
};
window.debugListProducts = function() {
  alert(JSON.stringify(getProducts(), null, 2));
};