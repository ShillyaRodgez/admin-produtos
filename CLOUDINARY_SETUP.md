# Configuração do Cloudinary

Siga estes passos para configurar o Cloudinary e resolver o problema de armazenamento de imagens:

## 1. Criar Conta no Cloudinary

1. Acesse: https://cloudinary.com/
2. Clique em "Sign Up for Free"
3. Crie sua conta gratuita
4. Confirme seu email

## 2. Obter Credenciais

1. Faça login no painel do Cloudinary
2. No Dashboard, você verá:
   - **Cloud Name** (exemplo: `minha-empresa`)
   - **API Key**
   - **API Secret**

## 3. Configurar Upload Preset

1. No painel do Cloudinary, vá em **Settings** → **Upload**
2. Role até "Upload presets"
3. Clique em "Add upload preset"
4. Configure:
   - **Preset name**: `produtos_preset` (ou outro nome)
   - **Signing Mode**: `Unsigned`
   - **Folder**: `produtos` (opcional)
   - **Allowed formats**: `jpg,png,gif,webp`
   - **Max file size**: `10MB`
5. Clique em "Save"

## 4. Configurar o Código

No arquivo `script.js`, substitua as linhas 2 e 3:

```javascript
const CLOUDINARY_CLOUD_NAME = 'SEU_CLOUD_NAME_AQUI'; // Substitua pelo seu Cloud Name
const CLOUDINARY_UPLOAD_PRESET = 'produtos_preset'; // Substitua pelo nome do seu preset
```

**Exemplo:**
```javascript
const CLOUDINARY_CLOUD_NAME = 'minha-empresa';
const CLOUDINARY_UPLOAD_PRESET = 'produtos_preset';
```

## 5. Testar

1. Salve o arquivo `script.js`
2. Recarregue a página no navegador
3. Tente adicionar um produto com uma imagem
4. A imagem deve ser enviada para o Cloudinary automaticamente

## Benefícios

✅ **Sem limite de localStorage** - As imagens ficam na nuvem
✅ **URLs permanentes** - As imagens não se perdem
✅ **Otimização automática** - Cloudinary otimiza as imagens
✅ **CDN global** - Carregamento rápido em qualquer lugar
✅ **25GB gratuitos** - Mais que suficiente para muitos produtos

## Solução de Problemas

**Erro de CORS:**
- Verifique se o Upload Preset está configurado como "Unsigned"

**Erro 401 (Unauthorized):**
- Verifique se o Cloud Name e Upload Preset estão corretos

**Upload muito lento:**
- Reduza o tamanho das imagens antes do upload
- O Cloudinary aceita até 10MB por imagem

## Suporte

Se tiver problemas, consulte a documentação oficial:
https://cloudinary.com/documentation/upload_images