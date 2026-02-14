const API_URL = 'http://localhost:3000';
const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageInput');
const imageList = document.getElementById('imageList');

let images = [];

// Fetch and render images list
async function loadImages() {
  try {
    const res = await fetch(`${API_URL}/images`);
    images = await res.json();
    renderImages();
  } catch (err) {
    console.error('Failed to load images', err);
    imageList.innerHTML = '<li>Erreur lors du chargement des images.</li>';
  }
}

// Render image list with thumbnails and delete buttons
function renderImages() {
  imageList.innerHTML = '';
  if (images.length === 0) {
    imageList.innerHTML = '<li>Aucune image disponible.</li>';
    return;
  }

  images.forEach(filename => {
    const li = document.createElement('li');

    const img = document.createElement('img');
    img.src = `${API_URL}/uploads/${filename}`;
    img.alt = filename;
    img.onerror = () => img.style.display = 'none';

    const span = document.createElement('span');
    span.textContent = filename;
    span.className = 'filename';

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Supprimer';
    btnDelete.className = 'btn-delete';
    btnDelete.onclick = () => deleteImage(filename);

    li.appendChild(img);
    li.appendChild(span);
    li.appendChild(btnDelete);

    imageList.appendChild(li);
  });
}

// Upload image handler
uploadForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!imageInput.files.length) return alert('Veuillez sélectionner une image.');

  const formData = new FormData();
  formData.append('image', imageInput.files[0]);

  try {
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();

    imageInput.value = '';
    images.push(data.filename);
    renderImages();
  } catch (err) {
    alert('Échec du téléchargement de l’image.');
    console.error(err);
  }
});

// Delete image handler
async function deleteImage(filename) {
  if (!confirm(`Voulez-vous vraiment supprimer "${filename}" ?`)) return;

  try {
    const res = await fetch(`${API_URL}/delete/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Delete failed');

    images = images.filter(f => f !== filename);
    renderImages();
  } catch (err) {
    alert('Échec de la suppression.');
    console.error(err);
  }
}

// Listen to live updates (SSE)
const evtSource = new EventSource(`${API_URL}/events`);
evtSource.onmessage = e => {
  const event = JSON.parse(e.data);
  if (event.type === 'add' && !images.includes(event.filename)) {
    images.push(event.filename);
    renderImages();
  } else if (event.type === 'delete') {
    images = images.filter(f => f !== event.filename);
    renderImages();
  }
};

// Initial load
loadImages();
