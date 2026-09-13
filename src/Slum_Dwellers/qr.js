(function () {
  // Inject QR modal if missing
  function injectQrModal() {
    if (document.getElementById('qrModal')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="complaint-modal" id="qrModal" aria-hidden="true">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="qrModalTitle">
          <div class="modal-header">
            <div class="modal-header-left">
              <div class="modal-title" id="qrModalTitle">Your QR Code</div>
              <div class="modal-category" id="qrModalSubtitle">Scan to share your Slum ID</div>
            </div>
          </div>
          <div class="modal-body">
            <div class="modal-description-card" style="display:flex; align-items:center; justify-content:center;">
              <div id="qrContainer" aria-label="Generated QR Code"></div>
            </div>
          </div>
          <div class="modal-actions">
            <button id="downloadQrBtn" class="btn primary" type="button">Download QR</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrapper.firstElementChild);
  }

  async function generateQRImageFromAPI(text) {
    const encodedText = encodeURIComponent(text);
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodedText}`;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load QR code from API'));
      img.src = qrApiUrl;
      img.alt = 'Generated QR Code';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
    });
  }

  function getSlumId() {
    // Prefer stored ID, then DOM, then default
    try {
      const stored = sessionStorage.getItem('slumId');
      if (stored) return stored;
    } catch {}
    const idEl = document.querySelector('.slum-id');
    let slumId = 'HSN01348';
    if (idEl) {
      const txt = (idEl.textContent || '').trim();
      const m = txt.match(/Slum ID:\s*(\S+)/i);
      if (m && m[1]) slumId = m[1];
    }
    return slumId;
  }

  function openModal() {
    const modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    const modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function generateQr() {
    const container = document.getElementById('qrContainer');
    if (!container) return;
    
    // Clear previous QR code
    while (container.firstChild) container.removeChild(container.firstChild);
    
    // Show loading state
    const loading = document.createElement('div');
    loading.textContent = 'Generating QR Code...';
    loading.style.padding = '20px';
    loading.style.textAlign = 'center';
    loading.style.color = '#666';
    container.appendChild(loading);
    
    try {
      const slumId = getSlumId();
      const text = `SLUMLINK-ID:${slumId}`;
      
      // Generate QR code using API
      const qrImage = await generateQRImageFromAPI(text);
      
      // Remove loading and add QR image
      container.removeChild(loading);
      container.appendChild(qrImage);
      
    } catch (error) {
      container.removeChild(loading);
      const errorDiv = document.createElement('div');
      errorDiv.textContent = 'Failed to generate QR Code';
      errorDiv.style.padding = '20px';
      errorDiv.style.textAlign = 'center';
      errorDiv.style.color = '#d32f2f';
      container.appendChild(errorDiv);
      console.error('QR generation failed:', error);
    }
  }

  function wireCloseAndDownload() {
    const modal = document.getElementById('qrModal');
    const modalContent = modal ? modal.querySelector('.modal-content') : null;
    const downloadBtn = document.getElementById('downloadQrBtn');

    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    if (modalContent) modalContent.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('keydown', (e) => {
      const m = document.getElementById('qrModal');
      if (e.key === 'Escape' && m && m.classList.contains('open')) closeModal();
    });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        try {
          const container = document.getElementById('qrContainer');
          if (!container) return;
          
          // Check if we have an image element
          const img = container.querySelector('img');
          if (!img || !img.src) {
            alert('QR image not available for download.');
            return;
          }
          
          const slumId = getSlumId();
          const filename = slumId !== 'UNKNOWN' ? `SlumLink_QR_${slumId}.png` : 'SlumLink_QR.png';
          
          try {
            // Try canvas method first (works if CORS is properly set)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Wait for image to load if it hasn't already
            if (!img.complete) {
              await new Promise((resolve) => {
                img.onload = resolve;
              });
            }
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
              if (!blob) {
                // Fallback to direct download
                downloadImageDirect(img.src, filename);
                return;
              }
              
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }, 'image/png');
            
          } catch (canvasError) {
            // Fallback: direct download from image URL
            console.log('Canvas method failed, using direct download:', canvasError.message);
            downloadImageDirect(img.src, filename);
          }
          
        } catch (err) {
          console.error('Failed to download QR:', err);
          alert('Failed to download QR code.');
        }
      });
    }
    
    // Fallback download function
    function downloadImageDirect(imageUrl, filename) {
      fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        })
        .catch(error => {
          console.error('Direct download failed:', error);
          // Last resort: open image in new tab
          const a = document.createElement('a');
          a.href = imageUrl;
          a.target = '_blank';
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        });
    }
  }

  // Public API
  window.__openQrModal = async function () {
    try {
      injectQrModal();
      await generateQr();
      wireCloseAndDownload();
      openModal();
    } catch (err) {
      console.error('QR modal open failed:', err);
      alert('Failed to generate QR code.');
    }
  };
})();
