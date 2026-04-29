import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoginModal from '../components/LoginModal';
import Toast from '../components/Toast';
import PatternModal from '../components/PatternModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useToast } from '../components/Toast';

const NB_PER_LOAD = 10;

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showError } = useToast();

  const [showLogin, setShowLogin] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [nbCreations, setNbCreations] = useState(0);
  const [nbFollowers, setNbFollowers] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [photoProfil, setPhotoProfil] = useState(null);

  const [patrons, setPatrons] = useState([]);
  const [patronIds, setPatronIds] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedPatron, setSelectedPatron] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [id]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, patronIds, idx]);

  function handleScroll() {
    const bottom = Math.abs(window.innerHeight + window.scrollY - document.documentElement.scrollHeight) < 1;
    if (bottom && !loading) loadNextBatch(patronIds, idx);
  }

  async function loadProfile() {
    try {
      const profileData = await api.get(`/user/api/${id}`);
      if (!profileData) { setNotFound(true); return; }
      setProfileUser(profileData);

      const [crea, followers] = await Promise.all([
        api.get(`/stats/nb-creations?idutilisateur=${profileData.idutilisateur}`),
        api.get(`/stats/nb-followers?idutilisateur=${profileData.idutilisateur}`)
      ]);
      setNbCreations(crea.nbcreations);
      setNbFollowers(followers.nbfollowers);

      const auth = await isAuthenticated();
      if (auth && user) {
        setIsOwner(user.idutilisateur === parseInt(id));
        const followCheck = await api.get(`/follow/check?followerId=${user.idutilisateur}&followingId=${profileData.idutilisateur}`);
        setIsFollowing(followCheck.isFollowing);
      }

      try {
        const photo = await api.post('/photo-profil', { idutil: profileData.idutilisateur });
        if (photo.photoprofile) setPhotoProfil(photo.photoprofile);
      } catch {}

      const ids = await api.get(`/profile/patrons/ids?id=${profileData.idutilisateur}`);
      setPatronIds(ids);
      setIdx(0);
      setPatrons([]);
      await loadNextBatch(ids, 0);

    } catch (err) {
      setNotFound(true);
    }
  }

  async function loadNextBatch(ids, startIdx) {
    if (loading) return;
    setLoading(true);
    const nextIds = ids.slice(startIdx, startIdx + NB_PER_LOAD);
    if (nextIds.length === 0) { setLoading(false); return; }
    try {
      const result = await api.post('/patrons/by-ids', { ids: nextIds });
      const withRatings = await Promise.all(result.map(async p => {
        try {
          const r = await api.get(`/patron/average-rating?idpatron=${p.idpatron}`);
          return { ...p, avgRating: r.avg_note !== null ? parseFloat(r.avg_note) : null };
        } catch { return p; }
      }));
      setPatrons(prev => [...prev, ...withRatings]);
      setIdx(startIdx + NB_PER_LOAD);
    } catch (err) {
      showError('Erreur chargement des patrons', 3000);
    }
    setLoading(false);
  }

  async function toggleFollow() {
    if (!user) { showError('Connectez-vous pour suivre cet utilisateur.', 3000); return; }
    const action = isFollowing ? 'unfollow' : 'follow';
    try {
      await api.post(`/follow/${action}`, { followerId: user.idutilisateur, followedId: profileUser.idutilisateur });
      setIsFollowing(!isFollowing);
      setNbFollowers(n => isFollowing ? n - 1 : n + 1);
    } catch (err) {
      showError('Erreur lors de l\'action de suivi.', 3000);
    }
  }

  function formatDate(d) {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  if (notFound) {
    return (
      <>
        <Toast />
        <Navbar onLoginClick={() => setShowLogin(true)} />
        {showLogin && <LoginModal mode="login" onClose={() => setShowLogin(false)} />}
        <div className="profile-page">
          <div className="profile-header">
            <div className="profile-header-content">
              <div className="user-info">
                <div className="pseudo" id="pseudonyme">Utilisateur inconnu</div>
                <div id="dateCreate"></div>
              </div>
              <div className="profile-stats" id="pfstats">
                <div>Créations: /</div>
                <div>Note Moyenne: /</div>
              </div>
            </div>
          </div>
          <div className="centermessageinfo">Ce compte n'existe pas</div>
        </div>
      </>
    );
  }

  if (!profileUser) {
    return (
      <>
        <Toast />
        <Navbar onLoginClick={() => setShowLogin(true)} />
        <div id="loader" style={{ display: 'flex', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
          <img src="/images/loadgif.gif" alt="Chargement..." style={{ width: '250px', height: '200px' }} />
        </div>
      </>
    );
  }

  const visiblePatrons = patrons.filter(p => p.visible === true || isOwner);

  return (
    <>
      <Toast />
      <Navbar onLoginClick={() => setShowLogin(true)} />
      {showLogin && <LoginModal mode="login" onClose={() => setShowLogin(false)} />}

      <div className="profile-page">
        <div className="profile-header">
          {photoProfil
            ? <img id="profile-image" src={`data:image/jpeg;base64,${photoProfil}`} alt="Photo de profil" className="profile-pic" />
            : <img id="profile-image" src="/img_par_defaut.jpeg" alt="Photo de profil" className="profile-pic" />
          }
          <div className="profile-header-content">
            <div className="user-info">
              <div className="pseudo" id="pseudonyme">{profileUser.nom}</div>
              <div id="dateCreate">Membre depuis le {formatDate(profileUser.datecreation)}</div>
            </div>

            <button className="follow-btn" id="followBtn" onClick={toggleFollow}>
              {isFollowing ? 'Se désabonner' : 'Suivre'}
            </button>

            <div className="profile-stats" id="pfstats">
              <p id="nbCrea">{nbCreations} création{nbCreations !== 1 ? 's' : ''}</p>
              <p id="nbFollowers">{nbFollowers} abonné{nbFollowers !== 1 ? 's' : ''}</p>
            </div>

            <div className="biographie" id="bioProfile">
              {profileUser.bio || "L'utilisateur n'a pas rentré de biographie, peut-être est-il fan de chats ?"}
            </div>

            <div className="classAchievement" id="idAchievement">
              <div className="achievement" id="idAchievementNbCrea1"
                style={{ display: nbCreations >= 5 ? undefined : 'none' }}>
                <img src="/images/trophy.png" alt="Trophée 1" />
                <p>Trophée Débloqué: Brodeur Dévoué</p>
              </div>
              <div className="achievement" id="idAchievementNbCrea2"
                style={{ display: nbCreations >= 10 ? undefined : 'none' }}>
                <img src="/images/trophy.png" alt="Trophée 2" />
                <p>Trophée Débloqué: Brodeur Expert</p>
              </div>
              <div className="achievement" id="idAchievementNbCrea3"
                style={{ display: nbCreations >= 15 ? undefined : 'none' }}>
                <img src="/images/trophy.png" alt="Trophée 3" />
                <p>Trophée Débloqué: Brodeur Maître</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-container" id="image-grid">
          {visiblePatrons.map(p => (
            <div key={p.idpatron} className="grid-item" onClick={() => setSelectedPatron(p)} style={{ cursor: 'pointer' }}>
              <div className="item-content">
                {p.imageresize && (
                  <img src={`data:image/png;base64,${p.imageresize}`} alt={p.nom} data-id={p.idpatron} />
                )}
              </div>
              <div className="item-info">
                <p className="item-title">{p.nom}</p>
                <p className="item-rating">
                  <span className="star">★</span>{' '}
                  {p.avgRating !== null && p.avgRating !== undefined
                    ? (p.avgRating % 1 === 0 ? String(Math.round(p.avgRating)) : p.avgRating.toFixed(2))
                    : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="loader" style={{ display: loading ? 'block' : 'none', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
        <img src="/images/loadgif.gif" alt="Chargement..." style={{ width: '250px', height: '200px' }} />
      </div>

      {selectedPatron && (
        <PatternModal
          patron={selectedPatron}
          onClose={() => setSelectedPatron(null)}
          isOwner={isOwner}
        />
      )}
    </>
  );
}
