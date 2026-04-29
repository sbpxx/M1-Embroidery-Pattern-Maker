import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, sha256 } from '../api';
import { useToast } from './Toast';

export default function LoginModal({ mode, onClose, onSuccess }) {
  const [view, setView] = useState(mode || 'login');
  const { login } = useAuth();
  const { showError, showSuccess } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [stayConnected, setStayConnected] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVerifPassword, setRegVerifPassword] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const hashed = await sha256(loginPassword);
      await login(loginEmail, hashed, stayConnected);
      showSuccess('Connexion réussie. Bienvenue!', 3000);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showError(err.message, 3000);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regName || !regEmail || !regPassword || !regVerifPassword) {
      showError('Tous les champs sont obligatoires.', 3000); return;
    }
    if (!emailPattern.test(regEmail)) { showError('Adresse e-mail invalide.', 3000); return; }
    if (regPassword !== regVerifPassword) { showError('Les mots de passe ne correspondent pas.', 3000); return; }
    if (regPassword.length < 8) { showError('Le mot de passe doit contenir au moins 8 caractères.', 3000); return; }
    try {
      const hashed = await sha256(regPassword);
      await api.post('/register', { nom: regName, email: regEmail, mot_de_passe: hashed });
      await login(regEmail, hashed, false);
      showSuccess('Inscription réussie. Bienvenue!', 3000);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showError(err.message, 3000);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forgotEmail) { showError('Veuillez entrer votre adresse e-mail.', 3000); return; }
    if (!emailPattern.test(forgotEmail)) { showError('Adresse e-mail invalide.', 3000); return; }
    try {
      await api.post('/forgot-password', { email: forgotEmail });
      showSuccess('E-mail de réinitialisation envoyé avec succès.', 3000);
      onClose();
    } catch (err) {
      showError(err.message, 3000);
    }
  }

  return (
    <>
      {view === 'login' && (
        <div className="modal-login" id="loginModal" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="modalW">
            <h2 style={{ marginBottom: '25px' }}>Connexion</h2>
            <input type="text" id="email" className="username" placeholder="Adresse mail"
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <input type="password" id="password" className="password" placeholder="Mot de passe"
              value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            <div className="options">
              <label className="remember-me">
                <input type="checkbox" className="checkbox" id="stayConnected"
                  checked={stayConnected} onChange={e => setStayConnected(e.target.checked)} />
                <div>Se rappeler de moi </div>
              </label>
              <a href="#" className="forgot-password" onClick={e => { e.preventDefault(); setView('forgot'); }}>Mot de passe oublié ?</a>
            </div>
            <button id="btn-login" className="login" onClick={handleLogin}>Se connecter</button>
            <p className="register-text">Vous n'avez pas de compte ? <a href="#" className="register_link" onClick={e => { e.preventDefault(); setView('register'); }}>S'inscrire</a></p>
          </div>
        </div>
      )}

      {view === 'register' && (
        <div className="modal-register" id="registerModal" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="modalW">
            <h2>Inscription</h2>
            <input type="text" className="username" placeholder="Nom d'utilisateur" id="register-username"
              value={regName} onChange={e => setRegName(e.target.value)} />
            <input type="email" className="mail" placeholder="Email utilisateur" id="register-email"
              value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            <input type="password" className="password" placeholder="Mot de passe" id="register-password"
              value={regPassword} onChange={e => setRegPassword(e.target.value)} />
            <input type="password" className="verifpassword" placeholder="Vérification du Mot de passe" id="register-verifpassword"
              value={regVerifPassword} onChange={e => setRegVerifPassword(e.target.value)} />
            <button id="btn-register" className="register" onClick={handleRegister}>S'inscrire</button>
            <p className="login-text">Vous avez déjà un compte ? <a href="#" className="login_link" onClick={e => { e.preventDefault(); setView('login'); }}>Se connecter</a></p>
          </div>
        </div>
      )}

      {view === 'forgot' && (
        <div className="modal-forgotpassword" id="forgotPasswordModal" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="modalW">
            <h2>Mot de passe oublié ?</h2>
            <p className="forgot-text">Vous allez recevoir un mail afin de pouvoir modifier votre mot de passe</p>
            <input type="email" className="mail" placeholder="Email utilisateur" id="forgot-email"
              value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
            <button id="btn-forgot" className="forgotbtn" onClick={handleForgot}>Demander</button>
            <p className="login-text">Vous vous souvenez de votre mot de passe ? <a href="#" className="login_linkf" style={{ textDecoration: 'none', color: '#007bff' }} onClick={e => { e.preventDefault(); setView('login'); }}>Se connecter</a></p>
            <div id="forgot-error" className="error-message"></div>
          </div>
        </div>
      )}
    </>
  );
}
