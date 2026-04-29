import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoginModal from '../components/LoginModal';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const carouselImages = [
    '/images/image1.jpg',
    '/images/image2.jpg',
    '/images/image3.jpg',
    '/images/image4.jpg',
  ];

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex(i => (i + 1) % carouselImages.length);
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function handleAccountClick() {
    if (!user) return;
    navigate(`/user/${user.idutilisateur}`);
  }

  const totalImages = carouselImages.length;

  function getStyle(index) {
    const position = (index - currentIndex + totalImages) % totalImages;
    if (position === 0) return { left: '50%', transform: 'translateX(-50%) scale(1.5)', zIndex: 3 };
    if (position === 1) return { left: '75%', transform: 'translateX(-50%) scale(1)', zIndex: 2 };
    if (position === totalImages - 1) return { left: '25%', transform: 'translateX(-50%) scale(1)', zIndex: 2 };
    return { left: '50%', transform: 'translateX(-50%) scale(0.5)', zIndex: 1 };
  }

  return (
    <>
      <Toast />
      <Navbar onLoginClick={() => setShowLogin(true)} />
      {showLogin && <LoginModal mode="login" onClose={() => setShowLogin(false)} />}

      <main>
        <div className="welcome">
          <h1>Bienvenue sur notre site</h1>
          <p>Vous pouvez commencer à explorer nos patrons et à les broder</p>
        </div>

        <div className="contenair-carousel">
          <div className="carousel" style={{ position: 'relative', height: '250px' }}>
            {carouselImages.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Image ${index + 1}`}
                className={index === currentIndex ? 'center' : ''}
                style={{ position: 'absolute', transition: 'all 0.5s ease', ...getStyle(index) }}
              />
            ))}
          </div>
        </div>

        <div className="options">
          <div className="option">
            <h2>Explorer</h2>
            <p>En manque d'inspiration ?</p>
            <p>Parcourez les patrons des autres utilisateurs</p>
            <a onClick={() => navigate('/explorer')} style={{ cursor: 'pointer' }}>Explorer</a>
          </div>
          <div className="option">
            <h2>Convertir</h2>
            <p>Âme de créateur ?</p>
            <p>Convertissez vos images en patrons</p>
            <a onClick={() => navigate('/convertir')} style={{ cursor: 'pointer' }}>Convertir</a>
          </div>
          {!user ? (
            <div className="option" id="option-login">
              <h2>Se connecter</h2>
              <p>Pour accéder à toutes les fonctionnalités</p>
              <a id="loginBtnAccueil" onClick={() => setShowLogin(true)} style={{ cursor: 'pointer' }}>Se connecter</a>
            </div>
          ) : (
            <div className="option" id="option-already-login" style={{ display: 'block' }}>
              <h2>Mon compte</h2>
              <p>Accédez à votre profil</p>
              <a id="accountBtnAccueil" onClick={handleAccountClick} style={{ cursor: 'pointer' }}>Mon compte</a>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
