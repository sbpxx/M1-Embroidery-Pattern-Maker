import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export default function Navbar({ onLoginClick }) {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isLoggedIn = !!token;

  useEffect(() => {
    function handleClickOutside(event) {
      const accountBtn = document.getElementById('accountBtn');
      const dropdownMenu = document.getElementById('dropdownMenu');
      if (dropdownMenu && accountBtn &&
          !dropdownMenu.contains(event.target) &&
          event.target !== accountBtn) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleDisconnect() {
    logout();
    showSuccess('Vous avez été déconnecté', 3000);
    setDropdownOpen(false);
    navigate('/');
  }

  return (
    <header>
      <nav className="navbar">
        <a href="#" className="logo" onClick={e => { e.preventDefault(); navigate('/'); }}>LES BRODEURS</a>
        <div className="nav-links">
          <ul>
            <li className="li_nav" id="accueil" onClick={() => navigate('/')}>Accueil</li>
            <li className="li_nav" id="convertir" onClick={() => navigate('/convertir')}>Convertir</li>
            <li className="li_nav" id="explorer" onClick={() => navigate('/explorer')}>Explorer</li>
            {!isLoggedIn
              ? <button className="btn_login" onClick={onLoginClick}>Connexion</button>
              : <>
                  <button id="accountBtn" className="btn_compte" style={{ display: 'block' }}
                    onClick={e => { e.stopPropagation(); setDropdownOpen(o => !o); }}>
                    Mon compte
                  </button>
                  <div className="dropdown-menu" id="dropdownMenu"
                    style={{ display: dropdownOpen ? 'block' : 'none' }}>
                    <a className="dropdown_item-1" id="profile" href="#"
                      onClick={e => { e.preventDefault(); setDropdownOpen(false); if (user) navigate(`/user/${user.idutilisateur}`); }}>
                      Profil
                    </a>
                    <a className="dropdown_item-2" id="param" href="#"
                      onClick={e => { e.preventDefault(); setDropdownOpen(false); navigate('/param'); }}>
                      Paramètres
                    </a>
                    <a className="dropdown_item-3" id="disconnect" href="#"
                      onClick={e => { e.preventDefault(); handleDisconnect(); }}>
                      Déconnexion
                    </a>
                  </div>
                </>
            }
          </ul>
        </div>
      </nav>
    </header>
  );
}
