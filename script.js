// Configuração do Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dnl9vuqdi'; // Substitua pelo seu cloud name
const CLOUDINARY_UPLOAD_PRESET = 'produtos_present'; // Substitua pelo seu upload preset
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Verificar se Cloudinary está configurado
const isCloudinaryConfigured = () => {
  return CLOUDINARY_CLOUD_NAME !== 'SEU_CLOUD_NAME' && CLOUDINARY_UPLOAD_PRESET !== 'SEU_UPLOAD_PRESET';
};

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
    tr.innerHTML = `
      <td><img src="${prod.image}" alt="${prod.name}" class="product-img"></td>
      <td>${prod.name}</td>
      <td>${prod.desc}</td>
      <td>${prod.category}</td>
      <td>R$ ${Number(prod.price).toFixed(2)}</td>
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
       products[id] = {...products[id], name, desc, price, image, category};
       Swal.fire('Produto atualizado!','', 'success');
     } else {
       products.push({name, desc, price, image, category});
       const message = isCloudinaryConfigured() ? 
         'Produto adicionado!' : 
         'Produto adicionado! (Configure Cloudinary para melhor performance)';
       Swal.fire(message,'', 'success');
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

window.onload = function() {
  renderProducts();
};
window.debugListProducts = function() {
  alert(JSON.stringify(getProducts(), null, 2));
};