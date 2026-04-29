import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import LoginModal from '../components/LoginModal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useToast } from '../components/Toast';

export default function Import() {
  const { user, isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentFile, setCurrentFile] = useState(null);
  const [stretch, setStretch] = useState(false);
  const lastSliderX = useRef(0);
  const [k, setK] = useState(5);
  const [hauteur, setHauteur] = useState(50);
  const [largeur, setLargeur] = useState(50);

  const [apiResult, setApiResult] = useState(null);
  const [originalB64, setOriginalB64] = useState(null);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState(['', '', '', '', '', '']);

  async function processImage(file) {
    if (!file) return;
    setLoading(true);
    setApiResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const b64 = reader.result.split(',')[1];
      setOriginalB64(b64);
      try {
        const ipData = await api.get('/currentIP');
        const apiData = { imageOriginale64: b64, param: { longueur: hauteur, largeur, k } };
        const resp = await fetch(`http://${ipData.ip}:60001/api/traitement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        });
        let data = await resp.json();
        if (typeof data === 'string') data = JSON.parse(data);
        setApiResult(data);

        try {
          const analysis = await api.post('/azure/titleandtags', { imageData: b64 });
          setTitre(analysis.titre || '');
          setTags([...analysis.tags.slice(0, 6), '', '', '', '', '', ''].slice(0, 6));
        } catch {}
      } catch (err) {
        showError('Erreur lors du traitement de l\'image', 3000);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  function loadImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCurrentFile(file);

    const img = new Image();
    img.onload = () => {
      let newW = img.width, newH = img.height, x = 1;
      while (newW > 100 || newH > 100) { x++; newW = Math.ceil(img.width / x); newH = Math.ceil(img.height / x); }
      setLargeur(newW);
      setHauteur(newH);
    };
    img.src = URL.createObjectURL(file);
  }

  useEffect(() => {
    if (currentFile) processImage(currentFile);
  }, [k, hauteur, largeur, stretch]);

  async function handleSave() {
    const auth = await isAuthenticated();
    if (!auth || !user) { showError('Vous devez vous connecter.', 3000); return; }
    if (!titre || !description) { showError('Veuillez remplir tous les champs.', 3000); return; }
    if (!apiResult) { showError('Veuillez traiter une image d\'abord.', 3000); return; }

    const filteredTags = tags.filter(t => t.trim() !== '').map(t => t.toLowerCase());
    setLoading(true);

    try {
      const ipData = await api.get('/currentIP');
      const themeResp = await fetch(`http://${ipData.ip}:60001/api/getTheme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: filteredTags })
      });
      const themeData = await themeResp.json();

      await api.post('/patron', {
        idutilisateur: user.idutilisateur,
        nom: titre,
        description,
        nbfil: k,
        patron: apiResult.patron,
        recapCouleur: apiResult.recapCouleur,
        imageResized: apiResult.ImageResized,
        imageOriginale: originalB64,
        tag: filteredTags,
        hauteur,
        largeur,
        themes: themeData.themes
      });

      showSuccess('Patron enregistré avec succès.', 3000);
      setShowSaveModal(false);
    } catch (err) {
      showError('Erreur lors de l\'enregistrement.', 3000);
    }
    setLoading(false);
  }

  async function handleUploadClick() {
    const auth = await isAuthenticated();
    if (!auth) { showError('Vous devez vous connecter pour enregistrer.', 3000); return; }
    if (!currentFile) { showError('Sélectionnez une image d\'abord.', 3000); return; }
    setDescription(titre);
    setShowSaveModal(true);
  }

  function handleGetPatron() {
    if (!apiResult) { showError('Traitez une image d\'abord.', 3000); return; }
    const el = document.getElementById('resultPatron');
    if (el) el.style.display = 'block';
  }

  const imageContainerStyle = { cursor: currentFile ? 'default' : 'pointer' };

  return (
    <>
      <Toast />
      <Navbar onLoginClick={() => setShowLogin(true)} />
      {showLogin && <LoginModal mode="login" onClose={() => setShowLogin(false)} />}

      <div id="loader-container" style={{ display: loading ? 'flex' : 'none' }}>
        <div id="loader-background"></div>
        <svg viewBox="0 0 200 200" id="longCat">
          <defs>
            <marker id="catHead" viewBox="0 0 100 100" refX="50" refY="50" markerWidth="2.5" markerHeight="2.5" orient="auto-start-reverse">
              <g transform="rotate(90 50 50)">
                <ellipse cx="20" cy="28" ry="25" rx="10" fill="#f5f5f5" />
                <ellipse cx="20" cy="21" ry="15" rx="6" fill="pink" />
                <ellipse cx="80" cy="28" ry="25" rx="10" fill="#f5f5f5" />
                <ellipse cx="80" cy="21" ry="15" rx="6" fill="pink" />
                <ellipse cx="16" cy="66" ry="25" rx="10" fill="#f5f5f5" stroke="#ccc" />
                <ellipse cx="80" cy="66" ry="25" rx="10" fill="#f5f5f5" stroke="#ccc" />
                <ellipse cx="50" cy="52" ry="36" rx="45" fill="#ccc" />
                <ellipse cx="50" cy="50" ry="35" rx="45" fill="#f5f5f5" />
                <circle cx="35" cy="45" r="9" fill="#111" />
                <circle cx="65" cy="45" r="9" fill="#111" />
                <circle cx="36" cy="41" r="3" fill="#fff" />
                <circle cx="64" cy="41" r="3" fill="#fff" />
                <path d="M50 54 v 3M 50 57 a 12 12 0 0 0 16 13 M 50 57 a 12 12 0 0 1 -16 13" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="50" cy="54" ry="4" rx="5" fill="pink" />
              </g>
            </marker>
          </defs>
          <path strokeDasharray="395.8965" strokeDashoffset="0" d="M 100 15 a 85 85 0 1 1 -85 85" fill="none" stroke="#f5f5f5" strokeWidth="10" strokeLinecap="round">
            <animate attributeName="stroke-dashoffset" values="337; 0; 337" dur="4s" begin="0s" repeatCount="indefinite" keyTimes="0;0.75;1" keySplines="0.5 0.25 0.75 0.5;0.5 0.25 0.75 0.5" />
            <animateTransform attributeName="transform" type="rotate" values="0 100 100; -360 100 100" dur="3s" begin="-2.85s" repeatCount="indefinite" />
          </path>
          <path strokeDasharray="306.3486" strokeDashoffset="0" d="M 100 35 a 65 65 0 1 1 -65 65" fill="none" stroke="#f5f5f5" strokeWidth="10" strokeLinecap="round">
            <animate attributeName="stroke-dashoffset" values="259; 0; 259" dur="4s" begin="0s" repeatCount="indefinite" keyTimes="0;0.75;1" keySplines="0.5 0.25 0.75 0.5;0.5 0.25 0.75 0.5" />
            <animateTransform attributeName="transform" type="rotate" values="0 100 100; -360 100 100" dur="3s" begin="-2.85s" repeatCount="indefinite" />
          </path>
          <path d="M 100 25 a 75 75 0 1 1 -75 75" fill="none" stroke="#f5f5f5" strokeWidth="30" strokeLinecap="round" strokeDasharray="353.4791" strokeDashoffset="0">
            <animate attributeName="stroke-dashoffset" values="300; 0; 300" dur="4s" begin="0s" repeatCount="indefinite" keyTimes="0;0.75;1" keySplines="0.5 0.25 0.75 0.5;0.5 0.25 0.75 0.5" />
            <animateTransform attributeName="transform" type="rotate" values="0 100 100; -360 100 100" dur="3s" begin="0s" repeatCount="indefinite" />
          </path>
          <path strokeDasharray="353.4791" strokeDashoffset="0" d="M 100 25 a 75 75 0 1 1 -75 75" fill="none" stroke="#ccc" strokeWidth="20" markerStart="url(#catHead)" strokeLinecap="round">
            <animate attributeName="stroke-dashoffset" values="300; 0; 300" dur="4s" begin="0s" repeatCount="indefinite" keyTimes="0;0.75;1" keySplines="0.5 0.25 0.75 0.5;0.5 0.25 0.75 0.5" />
            <animateTransform attributeName="transform" type="rotate" values="0 100 100; -360 100 100" dur="3s" begin="0s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>

      <main>
        <div className="container">
          <aside id="toolbar">
            <h3>Paramètres</h3>
            <div className="parameter">
              <label htmlFor="param1">Nombre de couleur :</label>
              <input type="number" id="param1" min="3" max="12" value={k}
                onChange={e => { setK(Number(e.target.value)); document.getElementById('range1').value = e.target.value; }} />
              <input type="range" id="range1" min="3" max="12" value={k}
                onChange={e => { setK(Number(e.target.value)); document.getElementById('param1').value = e.target.value; }} />
            </div>

            <div className="parameter">
              <label htmlFor="param2">Largeur de l'image :</label>
              <input type="number" id="param2" min="20" max="100" value={largeur}
                onChange={e => { setLargeur(Number(e.target.value)); document.getElementById('range2').value = e.target.value; }} />
              <input type="range" id="range2" min="20" max="100" value={largeur}
                onChange={e => { setLargeur(Number(e.target.value)); document.getElementById('param2').value = e.target.value; }} />

              <label htmlFor="param3">Hauteur de l'image :</label>
              <input type="number" id="param3" min="20" max="100" value={hauteur}
                onChange={e => { setHauteur(Number(e.target.value)); document.getElementById('range3').value = e.target.value; }} />
              <input type="range" id="range3" min="20" max="100" value={hauteur}
                onChange={e => { setHauteur(Number(e.target.value)); document.getElementById('param3').value = e.target.value; }} />
            </div>

            <div className="parameter">
              <label htmlFor="extend">Etendre l'image : </label>
              <input type="checkbox" id="stretchCheckbox" checked={stretch} onChange={e => setStretch(e.target.checked)} />
            </div>

            <div className="tb_buttons">
              <button id="getpatron" onClick={handleGetPatron}>Obtenir le patron</button>
            </div>
          </aside>

          <div id="main-content">
            <div id="image-container"
              onClick={() => { if (!currentFile) document.getElementById('fileInput').click(); }}
              style={{ cursor: currentFile ? 'default' : 'pointer' }}>
              {!currentFile
                ? <p>Veuillez insérer une image. (Cliquez pour insérer)</p>
                : (
                  <div className="comparison-slider-wrapper">
                    <div className="comparison-slider">
                      <img id="Image1" src={URL.createObjectURL(currentFile)} alt="Image originale"
                        style={stretch ? { width: '100%', height: '100%', objectFit: 'fill' } : { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      <div className="resize">
                        <img id="Image2"
                          src={apiResult ? `data:image/png;base64,${apiResult.ImageResized}` : ''}
                          alt=""
                          style={stretch ? { objectFit: 'fill' } : { objectFit: 'contain' }} />
                      </div>
                      <div className="divider" onMouseDown={e => {
                        e.preventDefault();
                        function moveSlider(ev) {
                          const divider = document.querySelector('.comparison-slider .divider');
                          const resize = document.querySelector('.comparison-slider .resize');
                          const img2 = document.querySelector('.comparison-slider .resize img');
                          if (!divider) return;
                          const rect = divider.parentElement.getBoundingClientRect();
                          let x = ev.clientX - rect.left;
                          if (x < 0) x = 0;
                          if (x > rect.width) x = rect.width;
                          const w = (x / rect.width) * 100 + '%';
                          divider.style.left = w;
                          resize.style.width = w;
                          if (img2) img2.style.width = rect.width + 'px';
                          lastSliderX.current = ev.clientX;
                        }
                        function stopSlider() {
                          document.removeEventListener('mousemove', moveSlider);
                          document.removeEventListener('mouseup', stopSlider);
                        }
                        document.addEventListener('mousemove', moveSlider);
                        document.addEventListener('mouseup', stopSlider);
                      }}></div>
                    </div>
                  </div>
                )
              }
            </div>
            <input type="file" id="fileInput" accept="image/*" style={{ display: 'none' }} onChange={loadImage} />
          </div>

          <div className="modal-save" id="saveModal" style={{ display: showSaveModal ? 'flex' : 'none' }}>
            <div className="modalW">
              <h2>Informations de l'image</h2>
              <h3>Titre :</h3>
              <input type="text" id="title" placeholder="Titre" value={titre} onChange={e => setTitre(e.target.value)} />
              <h3>Description :</h3>
              <textarea id="textDesc" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)}></textarea>
              <h3>Tags :</h3>
              <div className="tags-container">
                <div className="tags-row">
                  {[0, 1, 2].map(i => (
                    <input key={i} type="text" id={`tags${i + 1}`} placeholder={`tags${i + 1}`} className="tags-input"
                      value={tags[i]} onChange={e => { const t = [...tags]; t[i] = e.target.value; setTags(t); }} />
                  ))}
                </div>
                <div className="tags-row">
                  {[3, 4, 5].map(i => (
                    <input key={i} type="text" id={`tags${i + 1}`} placeholder={`tags${i + 1}`} className="tags-input"
                      value={tags[i]} onChange={e => { const t = [...tags]; t[i] = e.target.value; setTags(t); }} />
                  ))}
                </div>
              </div>
              <div className="modal-buttons">
                <button className="cancelBtn" id="cancelBtnId" onClick={() => setShowSaveModal(false)}>Annuler</button>
                <button className="uploadBtn" id="uploadBtnId" onClick={handleSave}>Partager</button>
              </div>
            </div>
          </div>
        </div>

        <div id="resultPatron" className="result" style={{ display: 'none' }}>
          <h2>Résultat</h2>
          <div className="result-content">
            <div className="result-image">
              <img src={apiResult ? `data:image/png;base64,${apiResult.patron}` : ''} alt="result" id="imgpatron" />
            </div>
            <div className="result-text">
              <img src={apiResult ? `data:image/png;base64,${apiResult.recapCouleur}` : ''} alt="result" id="imgrecapCouleur" />
            </div>
          </div>
          <div className="tb_buttons">
            <button id="uploader" onClick={handleUploadClick}>Partager à la communauté</button>
          </div>
        </div>
      </main>
    </>
  );
}
