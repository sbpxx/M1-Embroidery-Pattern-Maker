import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, sha256 } from '../api';
import Toast from '../components/Toast';
import { useToast } from '../components/Toast';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { showError('Les mots de passe ne correspondent pas.', 3000); return; }
    if (password.length < 8) { showError('Le mot de passe doit faire au moins 8 caractères.', 3000); return; }
    try {
      const hashed = await sha256(password);
      await api.post(`/reset-password/${token}`, { password: hashed });
      showSuccess('Mot de passe réinitialisé avec succès.', 3000);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      showError(err.message, 3000);
    }
  }

  return (
    <>
      <Toast />
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }}>
          <h2>Réinitialiser le mot de passe</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="password" placeholder="Nouveau mot de passe" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#2c2c2c', color: '#fff' }} />
            <input type="password" placeholder="Confirmer le mot de passe" value={confirm} onChange={e => setConfirm(e.target.value)} required style={{ padding: '8px', borderRadius: '6px', border: '1px solid #444', background: '#2c2c2c', color: '#fff' }} />
            <button type="submit" className="btn_login">Réinitialiser</button>
          </form>
        </div>
      </main>
    </>
  );
}
