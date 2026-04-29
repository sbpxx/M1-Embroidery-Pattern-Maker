import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <>
      <Toast />
      <main style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: '16px' }}>
        <h2>Page non trouvée</h2>
        <p>La page que vous cherchez n'existe pas.</p>
        <button className="btn_login" onClick={() => navigate('/')}>Retour à l'accueil</button>
      </main>
    </>
  );
}
