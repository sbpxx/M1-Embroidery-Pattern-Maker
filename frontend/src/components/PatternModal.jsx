import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { api, detectExtensionFromBase64 } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export default function PatternModal({ patron, onClose, isOwner = false }) {
  const { user, isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();

  const [images, setImages] = useState([]);
  const [currentImg, setCurrentImg] = useState(0);
  const [note, setNote] = useState(0);
  const [isVisible, setIsVisible] = useState(null);
  const [creatorName, setCreatorName] = useState('');
  const [creatorId, setCreatorId] = useState(null);

  useEffect(() => {
    if (!patron) return;
    loadModalData();
  }, [patron]);

  async function loadModalData() {
    try {
      const full = await api.post('/patronAndImage', { idpatron: patron.idpatron });
      setImages([full.imageresize, full.patron, full.symbole, full.image].filter(Boolean));
      setCurrentImg(0);
      setIsVisible(full.visible);

      const creator = await api.post('/image/creator', { idimage: patron.idpatron });
      setCreatorName(creator.nom);
      setCreatorId(creator.idutilisateur);

      const auth = await isAuthenticated();
      if (auth && user) {
        const notes = await api.get(`/getNote?idpatron=${patron.idpatron}&idutilisateur=${user.idutilisateur}`);
        if (notes.length > 0) setNote(notes[0].note);
        else setNote(0);
      }
    } catch (err) {
      console.error('Erreur chargement modal:', err);
    }
  }

  async function handleSubmitNote() {
    const auth = await isAuthenticated();
    if (!auth || !user) { showError('Vous devez vous connecter pour noter.', 3000); return; }
    if (!note) { showError('Veuillez sélectionner une note.', 3000); return; }
    try {
      await api.post('/enregistrerNote', { idutilisateur: user.idutilisateur, idpatron: patron.idpatron, note });
      showSuccess('Note enregistrée avec succès.', 3000);

      const facteurUtilisateur = await api.post('/user/facteurs', { idutilisateur: user.idutilisateur });
      const facteurImage = await api.post('/patron/facteurs', { idimage: patron.idpatron });
      const ipData = await api.get('/currentIP');
      const resp = await fetch(`http://${ipData.ip}:60001/api/modifierFacteur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, facteur_utilisateur: facteurUtilisateur, facteur_image: facteurImage })
      });
      if (resp.ok) {
        const data = await resp.json();
        await api.post('/user/facteurs/update', { idutilisateur: user.idutilisateur, facteurs: data.themes });
      }

      if (patron.tag) {
        const tags = Array.isArray(patron.tag) ? patron.tag : patron.tag.split(',');
        const nbclick = note >= 2.5 ? 5 : -5;
        for (const tag of tags) {
          await api.post('/update-recommendation', { id: user.idutilisateur, mot: tag.trim(), nbclick });
        }
      }
      onClose();
    } catch (err) {
      showError('Erreur lors de l\'enregistrement de la note.', 3000);
    }
  }

  async function handleDelete() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce patron ?')) return;
    try {
      await api.delete(`/deleteimages?idpatron=${patron.idpatron}`);
      showSuccess('Patron supprimé avec succès.', 3000);
      onClose();
    } catch (err) {
      showError('Erreur lors de la suppression.', 3000);
    }
  }

  async function handlePrivacyToggle() {
    const newStatus = !isVisible;
    try {
      await api.patch('/updatePrivacy', { idpatron: patron.idpatron, status: newStatus });
      setIsVisible(newStatus);
    } catch (err) {
      showError('Erreur lors de la mise à jour de la confidentialité.', 3000);
    }
  }

  function changeImage(dir) {
    setCurrentImg(i => (i + dir + images.length) % images.length);
  }

  function downloadZip() {
    const zip = new JSZip();
    images.forEach((b64, i) => {
      if (!b64) return;
      const data = b64.startsWith('data:') ? b64.split(',')[1] : b64;
      const ext = detectExtensionFromBase64(data);
      zip.file(`image_${i + 1}.${ext}`, data, { base64: true });
    });
    zip.generateAsync({ type: 'blob' }).then(content => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'patron.zip';
      link.click();
    });
  }

  const tagList = patron?.tag ? (Array.isArray(patron.tag) ? patron.tag : patron.tag.toString().split(',')) : [];

  return (
    <div id="imageModal" className="modal" style={{ display: 'flex' }}>
      <div className="modal-content-explore">
        <span className="close-modal" onClick={onClose}>&times;</span>
        <h2>Détails de l'Image</h2>

        <div className="delete-button-container">
          {isOwner && (
            <button id="deleteImageButton" className="delete-button" onClick={handleDelete}>
              Supprimer
            </button>
          )}
        </div>

        {isOwner && (
          <button id="confidentialité" className="confidentialité-button" onClick={handlePrivacyToggle}>
            {isVisible ? 'Privé' : 'Public'}
          </button>
        )}

        <div id="modal-image-container">
          <span className="prev" onClick={() => changeImage(-1)}>&#10094;</span>
          {images[currentImg] && (
            <img id="modal-image" src={`data:image/png;base64,${images[currentImg]}`} alt="Image à afficher" />
          )}
          <span className="next" onClick={() => changeImage(1)}>&#10095;</span>
        </div>

        <p id="image-name">Nom du patron : {patron?.nom}</p>
        <p id="image-description">Description : {patron?.description || ''}</p>
        <p id="image-tags">tags : {tagList.join(', ')}</p>
        <p id="image-utilisateur">
          {creatorId
            ? <a href={`/user/${creatorId}`} style={{ color: '#3498db', textDecoration: 'none' }}>{creatorName}</a>
            : creatorName}
        </p>

        <button id="download-zip-btn" onClick={downloadZip}>Télécharger les images</button>

        <div className="rating">
          <h3>Notez cette image :</h3>
          <div className="stars">
            {[5, 4, 3, 2, 1].map(n => (
              <span key={n}>
                <input type="radio" id={`star${n}`} name="rating" value={n}
                  checked={note === n} onChange={() => setNote(n)} />
                <label htmlFor={`star${n}`}>&#9733;</label>
              </span>
            ))}
          </div>
          <button id="submitNoteButton" onClick={handleSubmitNote}>Soumettre la note</button>
        </div>
      </div>
    </div>
  );
}
