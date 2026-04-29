import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import LoginModal from '../components/LoginModal';
import Toast from '../components/Toast';
import PatternModal from '../components/PatternModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useToast } from '../components/Toast';

const NB_PER_LOAD = 20;

export default function Explorer() {
  const { user, isAuthenticated } = useAuth();
  const { showError } = useToast();

  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState('pourMoi');
  const [loading, setLoading] = useState(false);
  const [selectedPatron, setSelectedPatron] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  const [pourMoiIds, setPourMoiIds] = useState([]);
  const [abonnementIds, setAbonnementIds] = useState([]);
  const [searchIds, setSearchIds] = useState([]);

  const [pourMoiPatrons, setPourMoiPatrons] = useState([]);
  const [abonnementPatrons, setAbonnementPatrons] = useState([]);
  const [searchPatrons, setSearchPatrons] = useState([]);

  const [idxPourMoi, setIdxPourMoi] = useState(0);
  const [idxAbonnement, setIdxAbonnement] = useState(0);
  const [idxSearch, setIdxSearch] = useState(0);

  const [sortDate, setSortDate] = useState(false);
  const [sortNote, setSortNote] = useState(false);
  const [sortNoteAsc, setSortNoteAsc] = useState(false);

  const isAuth = useRef(false);

  useEffect(() => {
    isAuthenticated().then(v => { isAuth.current = v; });
  }, []);

  useEffect(() => {
    initLoad();
  }, [user]);

  async function initLoad() {
    const auth = await isAuthenticated();
    isAuth.current = auth;
    await fetchIds(false);
  }

  async function fetchIds(triAsc = false) {
    try {
      let idUtilisateur = 0;
      if (user) idUtilisateur = user.idutilisateur;
      const result = await api.get(`/patrons/ids?id=${idUtilisateur}`);
      let pourMoi = result.pourMoi || [];
      const abonnement = result.abonnement || [];
      if (!sortNote && !searchMode) {
        abonnement.sort((a, b) => triAsc ? a - b : b - a);
      }
      setPourMoiIds(pourMoi);
      setAbonnementIds(abonnement);
      setIdxPourMoi(0);
      setIdxAbonnement(0);
      setPourMoiPatrons([]);
      setAbonnementPatrons([]);
      if (mode === 'pourMoi') await loadBatch(pourMoi, 0, setPourMoiPatrons, setIdxPourMoi);
      else await loadBatch(abonnement, 0, setAbonnementPatrons, setIdxAbonnement);
    } catch (err) {
      showError('Impossible de récupérer les patrons', 3000);
    }
  }

  async function loadBatch(ids, startIdx, setPatrons, setIdx) {
    if (loading) return;
    setLoading(true);
    const nextIds = ids.slice(startIdx, startIdx + NB_PER_LOAD);
    if (nextIds.length === 0) { setLoading(false); return; }
    try {
      const patrons = await api.post('/patrons/by-ids', { ids: nextIds });
      const patronMap = new Map(patrons.map(p => [p.idpatron, p]));
      const ordered = nextIds.map(id => patronMap.get(id)).filter(Boolean);
      const withRatings = await Promise.all(ordered.map(async p => {
        try {
          const r = await api.get(`/patron/average-rating?idpatron=${p.idpatron}`);
          const avg = r.avg_note !== null ? parseFloat(r.avg_note) : null;
          const creator = await api.post('/image/creator', { idimage: p.idpatron });
          return { ...p, avgRating: avg, creatorNom: creator.nom, creatorId: creator.idutilisateur };
        } catch { return p; }
      }));
      setPatrons(prev => [...prev, ...withRatings]);
      setIdx(startIdx + NB_PER_LOAD);
    } catch (err) {
      showError('Erreur de chargement', 3000);
    }
    setLoading(false);
  }

  async function handleSortDate() {
    const newAsc = !sortDate;
    setSortDate(newAsc);
    setSortNote(false);
    await fetchIds(newAsc);
  }

  async function handleSortNote() {
    const newAsc = !sortNoteAsc;
    setSortNoteAsc(newAsc);
    setSortNote(true);
    setSortDate(false);
    const allIds = mode === 'pourMoi' ? pourMoiIds : abonnementIds;
    setLoading(true);
    const notesList = await Promise.all(allIds.map(async id => {
      try {
        const r = await api.get(`/patron/average-rating?idpatron=${id}`);
        return { id, note: r.avg_note !== null ? parseFloat(r.avg_note) : -1 };
      } catch { return { id, note: -1 }; }
    }));
    notesList.sort((a, b) => newAsc ? a.note - b.note : b.note - a.note);
    const sortedIds = notesList.map(e => e.id);
    if (mode === 'pourMoi') {
      setPourMoiIds(sortedIds);
      setIdxPourMoi(0);
      setPourMoiPatrons([]);
      await loadBatch(sortedIds, 0, setPourMoiPatrons, setIdxPourMoi);
    } else {
      setAbonnementIds(sortedIds);
      setIdxAbonnement(0);
      setAbonnementPatrons([]);
      await loadBatch(sortedIds, 0, setAbonnementPatrons, setIdxAbonnement);
    }
    setLoading(false);
  }

  async function handleSearch() {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) {
      setSearchMode(false);
      setSearchPatrons([]);
      await fetchIds(sortDate);
      return;
    }
    setSearchMode(true);
    try {
      const result = await api.get(`/patrons/search?q=${encodeURIComponent(kw)}`);
      setSearchIds(result.ids);
      setIdxSearch(0);
      setSearchPatrons([]);
      await loadBatch(result.ids, 0, setSearchPatrons, setIdxSearch);
    } catch (err) {
      showError('Erreur recherche', 3000);
    }
  }

  function handleScroll() {
    const bottom = Math.abs(window.innerHeight + window.scrollY - document.documentElement.scrollHeight) < 1;
    if (!bottom || loading) return;
    if (searchMode) loadBatch(searchIds, idxSearch, setSearchPatrons, setIdxSearch);
    else if (mode === 'pourMoi') loadBatch(pourMoiIds, idxPourMoi, setPourMoiPatrons, setIdxPourMoi);
    else loadBatch(abonnementIds, idxAbonnement, setAbonnementPatrons, setIdxAbonnement);
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, mode, searchMode, pourMoiIds, abonnementIds, searchIds, idxPourMoi, idxAbonnement, idxSearch]);

  async function incrementInteret(patron) {
    if (!patron.tag) return;
    const tags = Array.isArray(patron.tag) ? patron.tag : patron.tag.toString().split(',');
    for (const tag of tags) {
      try { await api.post('/update-recommendation', { id: user ? user.idutilisateur : 0, mot: tag.trim(), nbclick: 1 }); } catch {}
    }
  }

  async function handlePatronClick(patron) {
    setSelectedPatron(patron);
    if (user) incrementInteret(patron);
  }

  async function switchMode(newMode) {
    setMode(newMode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (newMode === 'pourMoi' && pourMoiPatrons.length === 0) {
      await loadBatch(pourMoiIds, 0, setPourMoiPatrons, setIdxPourMoi);
    } else if (newMode === 'abonnement' && abonnementPatrons.length === 0) {
      await loadBatch(abonnementIds, 0, setAbonnementPatrons, setIdxAbonnement);
    }
  }

  return (
    <>
      <Toast />
      <Navbar onLoginClick={() => setShowLogin(true)} />
      {showLogin && <LoginModal mode="login" onClose={() => setShowLogin(false)} />}

      <main>
        <div className="welcome">
          <h1>Explorer</h1>
          <p>Explorer les créations de la communauté !</p>
        </div>

        <div className="search-bar">
          <input type="text" placeholder="Rechercher..." id="search-bar"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button id="search-button" onClick={handleSearch}>Rechercher</button>

          <div className="filter-dropdown">
            <button className="filter-button">Filtrer</button>
            <div className="dropdown-content">
              <button className={`filter-option${!sortNote ? ' active' : ''}`} id="filter-date" onClick={handleSortDate}>
                Date de création {sortDate ? '↑' : '↓'}
              </button>
              <button className="filter-option filter-rating" id="filter-rating" onClick={handleSortNote}>
                Note {sortNoteAsc ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="toggle">
          <input type="radio" name="sizeBy" value="weight" id="sizeWeight"
            checked={mode === 'pourMoi'} onChange={() => switchMode('pourMoi')} />
          <label id="btnPourMoi" htmlFor="sizeWeight">Pour moi</label>
          <input type="radio" name="sizeBy" value="dimensions" id="sizeDimensions"
            checked={mode === 'abonnement'} onChange={() => switchMode('abonnement')} />
          <label id="btnPourAbo" htmlFor="sizeDimensions">Mes abonnements</label>
        </div>

        <div className="grid-container" id="subscriptions-grid"
          style={{ display: mode === 'abonnement' && !searchMode ? undefined : 'none' }}>
          {abonnementPatrons.map(p => (
            <PatronCard key={p.idpatron} patron={p} onClick={() => handlePatronClick(p)} />
          ))}
        </div>

        <div className="grid-container" id="my-posts-grid"
          style={{ display: mode === 'pourMoi' && !searchMode ? undefined : 'none' }}>
          {pourMoiPatrons.map(p => (
            <PatronCard key={p.idpatron} patron={p} onClick={() => handlePatronClick(p)} />
          ))}
        </div>

        {searchMode && (
          <div className="grid-container">
            {searchPatrons.map(p => (
              <PatronCard key={p.idpatron} patron={p} onClick={() => handlePatronClick(p)} />
            ))}
          </div>
        )}
      </main>

      <div id="loader" style={{ display: loading ? 'block' : 'none', textAlign: 'center', margin: '20px' }}>
        <img src="/images/loadgif.gif" alt="Chargement..." style={{ width: '250px', height: '200px', marginRight: '40px' }} />
      </div>

      {selectedPatron && (
        <PatternModal
          patron={selectedPatron}
          onClose={() => setSelectedPatron(null)}
          isOwner={user && selectedPatron.creatorId === user.idutilisateur}
        />
      )}
    </>
  );
}

function PatronCard({ patron, onClick }) {
  function formatRating(avg) {
    if (avg === null || avg === undefined) return 'Pas de note';
    return avg % 1 === 0 ? String(Math.round(avg)) : avg.toFixed(2);
  }

  return (
    <div className="grid-item" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="item-content">
        {patron.imageresize && (
          <img
            src={`data:image/png;base64,${patron.imageresize}`}
            alt={patron.nom}
            data-id={patron.idpatron}
          />
        )}
      </div>
      <div className="item-info">
        <p className="item-title">{patron.nom}</p>
        <p className="item-rating">
          <span className="star">★</span> {formatRating(patron.avgRating)}
        </p>
      </div>
    </div>
  );
}
