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
// Variáveis globais para filtros
let allProducts = [];
let filteredProducts = [];

async function renderProducts(productsToRender = null) {
  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Carregando produtos...</td></tr>';
  
  if (productsToRender === null) {
    allProducts = await loadProducts();
    filteredProducts = [...allProducts];
    updateCategoryFilter();
  } else {
    filteredProducts = productsToRender;
  }
  
  const products = filteredProducts;
  tbody.innerHTML = '';
  
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #888;">Nenhum produto encontrado</td></tr>';
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
       const currentDate = new Date().toISOString();
       products.push({name, desc, price, discount, image, category, createdAt: currentDate});
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
     
     // Recarrega a tabela e atualiza filtros
     await renderProducts();
     updateCategoryFilter();
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
    updateCategoryFilter();
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

// Função auxiliar para carregar imagem como base64
function loadImageAsBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 15;
        canvas.height = 15;
        ctx.drawImage(img, 0, 0, 15, 15);
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        resolve(imgData);
      } catch (error) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Função para gerar PDF
function generatePDF(selectedMonth) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const monthNames = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
  };
  
  const currentYear = new Date().getFullYear();
  let title, fileName;
  
  if (selectedMonth === 'all') {
    title = `Lista de Produtos - Todos os Meses ${currentYear}`;
    fileName = `lista-produtos-todos-meses-${currentYear}.pdf`;
  } else if (selectedMonth && monthNames[selectedMonth]) {
    const monthName = monthNames[selectedMonth];
    title = `Lista de Produtos - ${monthName} ${currentYear}`;
    fileName = `lista-produtos-${monthName.toLowerCase()}-${currentYear}.pdf`;
  } else {
    title = 'Lista de Produtos';
    fileName = 'lista-produtos.pdf';
  }
  
  // Configurações do PDF
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;
  const rowHeight = 20;
  
  // Título
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Cabeçalho da tabela
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Nome', margin, yPosition);
  doc.text('Categoria', margin + 50, yPosition);
  doc.text('Preço Original', margin + 90, yPosition);
  doc.text('Desconto', margin + 130, yPosition);
  doc.text('Valor Final', margin + 160, yPosition);
  
  yPosition += 10;
  
  // Linha separadora
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;
  
  // Produtos - filtrar por mês
  let allProducts = getProducts();
  let products = allProducts;
  
  // Filtrar produtos por mês se não for "all"
   if (selectedMonth !== 'all' && selectedMonth) {
     const currentDate = new Date();
     const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
     
     products = allProducts.filter(product => {
       if (!product.createdAt) {
         // Produtos antigos sem data - incluir apenas no mês atual
         return selectedMonth === currentMonth;
       }
       const productDate = new Date(product.createdAt);
       const productMonth = String(productDate.getMonth() + 1).padStart(2, '0');
       const productYear = productDate.getFullYear();
       return productMonth === selectedMonth && productYear === currentYear;
     });
   }
   
   // Verificar se há produtos para o período selecionado
   if (products.length === 0) {
     const periodText = selectedMonth === 'all' ? 'todos os meses' : monthNames[selectedMonth];
     Swal.fire({
       icon: 'info',
       title: 'Nenhum produto encontrado',
       text: `Não há produtos cadastrados para ${periodText} de ${currentYear}.`,
       confirmButtonText: 'OK'
     });
     return;
   }
   
   doc.setFont(undefined, 'normal');
  
  let totalOriginal = 0;
  let totalFinal = 0;
  
  products.forEach((product, index) => {
    if (yPosition > 250) { // Nova página se necessário
      doc.addPage();
      yPosition = 30;
    }
    
    const finalPrice = product.discount > 0 ? 
      (product.price * (1 - product.discount/100)) : 
      product.price;
    
    totalOriginal += product.price;
    totalFinal += finalPrice;
    
    // Textos do produto
    doc.text(product.name.substring(0, 20), margin, yPosition + 5);
    doc.text(product.category.substring(0, 15), margin + 50, yPosition + 5);
    doc.text(`R$ ${product.price.toFixed(2)}`, margin + 90, yPosition + 5);
    
    if (product.discount > 0) {
      doc.text(`${product.discount}%`, margin + 130, yPosition + 5);
    } else {
      doc.text('-', margin + 130, yPosition + 5);
    }
    
    doc.text(`R$ ${finalPrice.toFixed(2)}`, margin + 160, yPosition + 5);
    
    yPosition += rowHeight;
  });
  
  // Resumo separado
  yPosition += 15;
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 30;
  }
  
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('RESUMO FINANCEIRO', margin, yPosition);
  
  // Adicionar informação do período
  if (selectedMonth === 'all') {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    yPosition += 8;
    doc.text('(Relatório consolidado de todos os meses)', margin, yPosition);
  } else if (selectedMonth && monthNames[selectedMonth]) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    yPosition += 8;
    doc.text(`(Relatório do mês de ${monthNames[selectedMonth]})`, margin, yPosition);
  }
  
  yPosition += 15;
  
  // Seção de valores sem desconto
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('VALORES SEM DESCONTO:', margin, yPosition);
  doc.setFont(undefined, 'normal');
  yPosition += 10;
  doc.text(`• Total de produtos: ${products.length}`, margin + 5, yPosition);
  yPosition += 8;
  doc.text(`• Valor total original: R$ ${totalOriginal.toFixed(2)}`, margin + 5, yPosition);
  
  yPosition += 15;
  
  // Seção de valores com desconto
  doc.setFont(undefined, 'bold');
  doc.text('VALORES COM DESCONTO:', margin, yPosition);
  doc.setFont(undefined, 'normal');
  yPosition += 10;
  doc.text(`• Valor total final: R$ ${totalFinal.toFixed(2)}`, margin + 5, yPosition);
  yPosition += 8;
  doc.text(`• Economia total: R$ ${(totalOriginal - totalFinal).toFixed(2)}`, margin + 5, yPosition);
  yPosition += 8;
  const economyPercent = totalOriginal > 0 ? ((totalOriginal - totalFinal) / totalOriginal * 100).toFixed(1) : '0.0';
  doc.text(`• Percentual de economia: ${economyPercent}%`, margin + 5, yPosition);
  
  // Download do PDF
  doc.save(fileName);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportProducts);
  }
  
  const pdfBtn = document.getElementById('pdf-btn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', openMonthModal);
  }
  
  // Event listeners para o modal
  const cancelPdfBtn = document.getElementById('cancel-pdf');
  if (cancelPdfBtn) {
    cancelPdfBtn.addEventListener('click', closeMonthModal);
  }
  
  const confirmPdfBtn = document.getElementById('confirm-pdf');
  if (confirmPdfBtn) {
    confirmPdfBtn.addEventListener('click', confirmPDFGeneration);
  }
  
  const closeBtn = document.querySelector('.close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMonthModal);
  }
  
  // Fechar modal clicando fora dele
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('month-modal');
    if (event.target === modal) {
      closeMonthModal();
    }
  });
});

// Funções do modal
function openMonthModal() {
  document.getElementById('month-modal').style.display = 'block';
}

function closeMonthModal() {
  document.getElementById('month-modal').style.display = 'none';
}

function confirmPDFGeneration() {
  const selectedMonth = document.getElementById('month-selector').value;
  closeMonthModal();
  generatePDF(selectedMonth);
}

// Funções de filtro
function updateCategoryFilter() {
  const categorySelect = document.getElementById('filter-category');
  const categories = [...new Set(allProducts.map(product => product.category))].sort();
  
  // Limpar opções existentes (exceto "Todas as categorias")
  categorySelect.innerHTML = '<option value="">Todas as categorias</option>';
  
  // Adicionar categorias únicas
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

function applyFilters() {
  const nameFilter = document.getElementById('filter-name').value.toLowerCase().trim();
  const categoryFilter = document.getElementById('filter-category').value;
  
  filteredProducts = allProducts.filter(product => {
    const matchesName = !nameFilter || product.name.toLowerCase().includes(nameFilter);
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesName && matchesCategory;
  });
  
  renderProducts(filteredProducts);
}

function clearFilters() {
  document.getElementById('filter-name').value = '';
  document.getElementById('filter-category').value = '';
  filteredProducts = [...allProducts];
  renderProducts(filteredProducts);
}

// Event listeners para filtros
document.addEventListener('DOMContentLoaded', function() {
  const filterName = document.getElementById('filter-name');
  const filterCategory = document.getElementById('filter-category');
  const clearFiltersBtn = document.getElementById('clear-filters');
  
  // Filtro em tempo real para nome
  filterName.addEventListener('input', applyFilters);
  
  // Filtro para categoria
  filterCategory.addEventListener('change', applyFilters);
  
  // Botão limpar filtros
  clearFiltersBtn.addEventListener('click', clearFilters);
});

window.onload = async function() {
  await renderProducts();
};
window.debugListProducts = function() {
  alert(JSON.stringify(getProducts(), null, 2));
};