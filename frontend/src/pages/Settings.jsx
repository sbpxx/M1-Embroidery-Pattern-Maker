import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoginModal from '../components/LoginModal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { api, sha256 } from '../api';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { user, token, isAuthenticated, login, logout } = useAuth();
  const { showError, showSuccess } = useToast();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');
  const [photoProfil, setPhotoProfil] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [idUtil, setIdUtil] = useState(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  const [showPassModal, setShowPassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadUserInfo();
  }, []);

  async function loadUserInfo() {
    const auth = await isAuthenticated();
    if (!auth) { showError('Vous devez vous connecter.', 3000); navigate('/'); return; }
    const emailStored = sessionStorage.getItem('email') || localStorage.getItem('email');
    if (!emailStored) return;
    try {
      const data = await api.get(`/user?email=${encodeURIComponent(emailStored)}`, token);
      setNom(data.nom || '');
      setEmail(data.email || '');
      setBio(data.bio || '');
      setPassword(data.mot_de_passe || '');
      setIdUtil(data.idutilisateur);

      try {
        const photo = await api.post('/photo-profil', { idutil: data.idutilisateur });
        if (photo.photoprofile) {
          setPhotoPreview(`data:image/jpeg;base64,${photo.photoprofile}`);
          const photoDiv = document.getElementById('photoM');
          if (photoDiv) photoDiv.innerHTML = '';
          const img = document.createElement('img');
          img.src = `data:image/jpeg;base64,${photo.photoprofile}`;
          img.style.cssText = 'width:100px;height:100px;border-radius:50%;object-fit:cover;';
          if (photoDiv) photoDiv.appendChild(img);
        }
      } catch {}
    } catch (err) {
      showError('Erreur lors du chargement du profil.', 3000);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const photoDiv = document.getElementById('photoM');
      if (photoDiv) {
        photoDiv.innerHTML = '';
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.style.cssText = 'width:100px;height:100px;border-radius:50%;object-fit:cover;';
        photoDiv.appendChild(img);
      }
    };
    reader.readAsDataURL(file);
    getBase64(file).then(b64 => setPhotoProfil(b64));
  }

  function getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  }

  function validateEmail() {
    if (newEmail !== confirmEmail) { alert('Les emails ne correspondent pas.'); return; }
    setEmail(confirmEmail);
    setShowEmailModal(false);
  }

  function validatePassword() {
    if (newPassword !== confirmPassword) { alert('Les mots de passe ne correspondent pas.'); return; }
    if (newPassword.length < 8) { alert('Le mot de passe doit faire au moins 8 caractères.'); return; }
    setPassword(newPassword);
    setShowPassModal(false);
  }

  async function handleSubmit() {
    if (!idUtil) return;
    try {
      const hashedPass = await sha256(password);
      await api.post('/update-profile', { idutilisateur: idUtil, nom, bio, email, mot_de_passe: hashedPass, photo_profile: photoProfil });
      showSuccess('Profil mis à jour avec succès.', 3000);
      logout();
      await login(email, hashedPass, !!localStorage.getItem('authToken'));
    } catch (err) {
      showError('Erreur lors de la mise à jour du profil.', 3000);
    }
  }

  return (
    <>
      <Toast />
      <Navbar onLoginClick={() => setShowLogin(true)} />
      {showLogin && <LoginModal mode="login" onClose={() => setShowLogin(false)} />}

      <div className="form-container-modif">
        <div className="photoModif" id="photoM">Aucune photo</div>
        <label className="labelModif" htmlFor="fileInput">Ajouter une photo</label>
        <input type="file" id="fileInput" accept="image/*" onChange={handleFileChange} />

        <label htmlFor="usernameModif">Nom d'utilisateur</label>
        <input type="text" id="usernameModif" name="username" placeholder="Entrez votre nom d'utilisateur"
          value={nom} onChange={e => setNom(e.target.value)} required />

        <label htmlFor="bioModif">Biographie</label>
        <textarea id="bioModif" name="bio" placeholder="Parlez de vous..." rows="4"
          value={bio} onChange={e => setBio(e.target.value)}></textarea>

        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" value={email} disabled required />
        <button type="button" className="changeMail" id="modalMail" onClick={() => setShowEmailModal(true)}>Modifier le mail</button>

        <label htmlFor="password">Mot de passe</label>
        <input type="password" id="password" name="password" value={password} disabled />
        <button type="button" className="changePassword" id="modalPass" onClick={() => setShowPassModal(true)}>Modifier le mot de passe</button>

        <button type="submit" className="submitButton-modif" id="subButMod" onClick={handleSubmit}>Enregistrer les modifications</button>
      </div>

      <div className="modal-modifi" id="emailModal" style={{ display: showEmailModal ? 'flex' : 'none' }}>
        <div className="modal-modif">
          <button className="modal-close-modif" id="mailClose" onClick={() => setShowEmailModal(false)}>X</button>
          <h3>Modifier votre Email</h3>
          <label htmlFor="newEmail">Nouveau Email</label>
          <input type="email" id="newEmail" placeholder="Entrez le nouvel email"
            value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <label htmlFor="confirmEmail">Confirmer l'Email</label>
          <input type="email" id="confirmEmail" placeholder="Confirmez le nouvel email"
            value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} />
          <button onClick={validateEmail}>Valider</button>
        </div>
      </div>

      <div className="modal-modifi" id="passwordModal" style={{ display: showPassModal ? 'flex' : 'none' }}>
        <div className="modal-modif">
          <button className="modal-close-modif" id="passwordClose" onClick={() => setShowPassModal(false)}>X</button>
          <h3>Modifier votre Mot de Passe</h3>
          <label htmlFor="newPassword">Nouveau Mot de Passe</label>
          <input type="password" id="newPassword" placeholder="Entrez le nouveau mot de passe"
            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <label htmlFor="confirmPassword">Confirmer le Mot de Passe</label>
          <input type="password" id="confirmPassword" placeholder="Confirmez le mot de passe"
            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <button onClick={validatePassword}>Valider</button>
        </div>
      </div>
    </>
  );
}
