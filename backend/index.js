const express = require('express');
const app = express();
const port = 8080;
const path = require('path');
const pool = require('./js/libraryBDD');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { CognitiveServicesCredentials } = require('@azure/ms-rest-azure-js');

const endpoint = process.env['VISION_ENDPOINT'] || '';
const apiKey = process.env['VISION_KEY'] || '';

const credentials = new CognitiveServicesCredentials(apiKey);
const visionClient = new ComputerVisionClient(credentials, endpoint);

const secretKey = process.env.JWT_SECRET || 'your-256-bit-secret';

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json());

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post('/register', async (req, res) => {
    try {
        const client = await pool.connect();
        const emailCheck = await client.query('SELECT * FROM utilisateur WHERE email = $1', [req.body.email]);
        if (emailCheck.rows.length > 0) {
            client.release();
            return res.status(400).json({ error: 'Adresse e-mail déjà utilisée' });
        }
        const result = await client.query(
            'INSERT INTO utilisateur (nom, email, mot_de_passe) VALUES ($1, $2, $3) RETURNING *',
            [req.body.nom, req.body.email, req.body.mot_de_passe]
        );
        await client.query(
            'INSERT INTO facteursutilisateur (id, facteurs) VALUES ($1, $2)',
            [result.rows[0].idutilisateur, '{"art":0,"autre":0,"fleur":0,"manga":0,"sport":0,"animal":0,"astres":0,"vidéo":0,"paysage":0,"aquatique":0,"forestier":0,"véhicule":0,"nourriture":0,"informatique":0,"architectural":0,"biodiversité":0}']
        );
        client.release();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'utilisateur' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM utilisateur WHERE email = $1 AND mot_de_passe = $2',
            [req.body.email, req.body.password]
        );
        if (result.rows.length > 0) {
            const token = jwt.sign({ id: result.rows[0].idutilisateur }, secretKey);
            client.release();
            return res.status(200).json({ token });
        }
        const emailCheck = await client.query('SELECT * FROM utilisateur WHERE email = $1', [req.body.email]);
        client.release();
        if (emailCheck.rows.length > 0) return res.status(400).json({ error: 'Mot de passe incorrect' });
        return res.status(400).json({ error: 'Utilisateur non trouvé' });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Accès refusé' });
    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ error: 'Jeton invalide ou expiré' });
        req.user = user;
        next();
    });
}

app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Accès autorisé', user: req.user });
});

// ─── Users ────────────────────────────────────────────────────────────────────

app.get('/user', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT idutilisateur, nom, email, datecreation, bio, mot_de_passe FROM utilisateur WHERE email = $1',
            [req.query.email]
        );
        client.release();
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/userbyid', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT idutilisateur, nom, email, datecreation, bio, mot_de_passe FROM utilisateur WHERE idutilisateur = $1',
            [req.query.id]
        );
        client.release();
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/user/api/:id', async (req, res) => {
    if (!req.params.id) return res.status(400).json({ error: 'ID utilisateur manquant' });
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM utilisateur WHERE idutilisateur = $1', [req.params.id]);
        client.release();
        if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur non trouvé' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/update-profile', async (req, res) => {
    const { idutilisateur, bio, nom, email, mot_de_passe, photo_profile } = req.body;
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query(
            'UPDATE utilisateur SET nom=$2, bio=$3, email=$4, mot_de_passe=$5, photoprofil=$6 WHERE idutilisateur=$1',
            [idutilisateur, nom, bio, email, mot_de_passe, photo_profile]
        );
        await client.query('COMMIT');
        res.status(200).json({ message: 'Profil mis à jour avec succès' });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    } finally {
        if (client) client.release();
    }
});

app.post('/photo-profil', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT photoprofil FROM utilisateur WHERE idutilisateur = $1', [req.body.idutil]);
        if (result.rows.length > 0) {
            res.status(200).json({ photoprofile: result.rows[0].photoprofil });
        } else {
            res.status(404).json({ error: 'Photo de profil non trouvée' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        if (client) client.release();
    }
});

// ─── Stats ────────────────────────────────────────────────────────────────────

app.get('/stats/nb-creations', async (req, res) => {
    const id = req.query.idutilisateur;
    if (!id) return res.status(400).json({ error: 'ID manquant' });
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT COUNT(*) FROM patron JOIN image ON patron.idimage = image.idimage WHERE image.idutilisateur = $1',
            [id]
        );
        client.release();
        res.json({ nbcreations: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/stats/nb-followers', async (req, res) => {
    const id = req.query.idutilisateur;
    if (!id) return res.status(400).json({ error: 'ID manquant' });
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM subscribe WHERE followed_id = $1', [id]);
        client.release();
        res.json({ nbfollowers: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── Patrons ──────────────────────────────────────────────────────────────────

app.get('/patrons/all', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM patron');
        client.release();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/user/patrons', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM patron, image WHERE patron.idimage = image.idimage AND image.idutilisateur = $1',
            [req.query.idutilisateur]
        );
        client.release();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/patron', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const dateImport = new Date().toISOString();
        const imageResult = await client.query(
            'INSERT INTO image (idutilisateur, image, dateimport) VALUES ($1, $2, $3) RETURNING *',
            [req.body.idutilisateur, req.body.imageOriginale, dateImport]
        );
        const idimage = imageResult.rows[0].idimage;
        const patronResult = await client.query(
            'INSERT INTO patron (nom, description, idimage, nbfil, patron, tag, imageresize, hauteur, largeur, symbole) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [req.body.nom, req.body.description, idimage, req.body.nbfil, req.body.patron, req.body.tag, req.body.imageResized, req.body.hauteur, req.body.largeur, req.body.recapCouleur]
        );
        const idpatron = patronResult.rows[0].idpatron;
        await client.query('INSERT INTO facteursimage (id, facteurs) VALUES ($1, $2)', [idimage, req.body.themes]);
        await client.query('COMMIT');
        res.status(201).json({ idpatron, idimage });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error(err.stack);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du patron' });
    } finally {
        if (client) client.release();
    }
});

app.post('/patrons/by-ids', async (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Liste d\'IDs invalide ou vide.' });
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT idpatron, nom, description, datecreation, nbfil, tag, imageresize, visible FROM patron WHERE idpatron = ANY($1::int[])`,
            [ids]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        if (client) client.release();
    }
});

app.get('/patrons/ids', async (req, res) => {
    const idParam = req.query.id;
    if (idParam === undefined || idParam === null || idParam === '') return res.status(400).json({ error: 'ID utilisateur manquant' });
    const idUtilisateur = parseInt(idParam, 10);
    if (isNaN(idUtilisateur)) return res.status(400).json({ error: 'ID utilisateur invalide' });
    let client;
    try {
        client = await pool.connect();
        if (idUtilisateur === 0) {
            const result = await client.query('SELECT idpatron FROM patron');
            return res.json({ pourMoi: result.rows.map(r => r.idpatron), abonnement: [] });
        }
        const facteursUtilisateur = await client.query('SELECT facteurs FROM facteursutilisateur WHERE id = $1', [idUtilisateur]);
        const facteursImage = await client.query('SELECT * FROM facteursimage LIMIT 5000');
        const configData = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
        const response = await fetch(`http://${configData.IP_API}:60001/api/recommendation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idutilisateur: idUtilisateur,
                facteursUtilisateur: facteursUtilisateur.rows[0]?.facteurs,
                facteursImage: facteursImage.rows
            })
        });
        const pourMoiResult = await response.json();
        const abonnementResult = await client.query(
            `SELECT patron.idpatron FROM subscribe JOIN image ON subscribe.followed_id = image.idutilisateur JOIN patron ON image.idimage = patron.idimage WHERE subscribe.follower_id = $1`,
            [idUtilisateur]
        );
        res.json({ pourMoi: pourMoiResult.recommendations, abonnement: abonnementResult.rows.map(r => r.idpatron) });
    } catch (err) {
        console.error(err.stack);
        res.status(500).json({ error: 'Erreur serveur: ' + err.message });
    } finally {
        if (client) client.release();
    }
});

app.get('/patrons/search', async (req, res) => {
    const keyword = req.query.q;
    if (!keyword) return res.status(400).json({ error: 'Le mot-clé est requis.' });
    try {
        const result = await pool.query(
            `SELECT idpatron FROM patron WHERE LOWER(nom) LIKE LOWER($1) OR EXISTS (SELECT 1 FROM UNNEST(tag) AS t WHERE LOWER(t) LIKE LOWER($1))`,
            [`%${keyword}%`]
        );
        res.json({ ids: result.rows.map(r => r.idpatron) });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/patronAndImage', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM patron, image WHERE patron.idimage = image.idimage AND idpatron = $1',
            [req.body.idpatron]
        );
        client.release();
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/getPatron', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT idpatron, nom, visible FROM patron WHERE idpatron = $1', [req.query.idpatron]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Patron non trouvé' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

app.patch('/updatePrivacy', async (req, res) => {
    const { idpatron, status } = req.body;
    if (isNaN(idpatron) || idpatron <= 0) return res.status(400).json({ error: 'ID patron invalide' });
    const client = await pool.connect();
    try {
        const result = await client.query('UPDATE patron SET visible=$1 WHERE idpatron=$2 RETURNING *', [status, idpatron]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Patron non trouvé' });
        res.json({ message: 'Confidentialité mise à jour avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

app.delete('/deleteimages', async (req, res) => {
    const client = await pool.connect();
    try {
        const idpatron = req.query.idpatron;
        if (isNaN(idpatron) || idpatron <= 0) return res.status(400).json({ error: 'ID invalide' });
        const result = await client.query('DELETE FROM patron WHERE idpatron=$1 RETURNING *', [idpatron]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Patron non trouvé' });
        res.json({ message: 'Patron supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

app.get('/profile/patrons/ids', async (req, res) => {
    const idUtilisateur = parseInt(req.query.id);
    if (isNaN(idUtilisateur)) return res.status(400).json({ error: 'ID utilisateur invalide' });
    try {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT patron.idpatron FROM patron JOIN image ON patron.idimage = image.idimage WHERE image.idutilisateur = $1',
            [idUtilisateur]
        );
        client.release();
        res.json(result.rows.map(r => r.idpatron));
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── Notes ────────────────────────────────────────────────────────────────────

app.post('/enregistrerNote', async (req, res) => {
    const { idutilisateur, idpatron, note } = req.body;
    if (!idutilisateur || !idpatron || !note) return res.status(400).json({ error: 'Données manquantes' });
    try {
        const client = await pool.connect();
        const noteCheck = await client.query('SELECT * FROM note WHERE idutilisateur=$1 AND idpatron=$2', [idutilisateur, idpatron]);
        if (noteCheck.rows.length > 0) {
            await client.query('UPDATE note SET note=$1 WHERE idutilisateur=$2 AND idpatron=$3', [note, idutilisateur, idpatron]);
            client.release();
            return res.status(200).json({ message: 'Note mise à jour avec succès' });
        }
        await client.query('INSERT INTO note (idutilisateur, idpatron, note) VALUES ($1, $2, $3)', [idutilisateur, idpatron, note]);
        client.release();
        res.status(201).json({ message: 'Note enregistrée avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/getNote', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM note WHERE idpatron=$1 AND idutilisateur=$2', [req.query.idpatron, req.query.idutilisateur]);
        client.release();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/patron/average-rating', async (req, res) => {
    const idpatron = parseInt(req.query.idpatron);
    if (!idpatron) return res.status(400).json({ error: 'ID patron manquant' });
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT AVG(note) as avg_note FROM note WHERE idpatron=$1', [idpatron]);
        client.release();
        res.json({ avg_note: result.rows[0].avg_note });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/user/ratings', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT idutilisateur, idpatron, note FROM notes ORDER BY note ASC');
        client.release();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── Follow ───────────────────────────────────────────────────────────────────

app.get('/follow/check', async (req, res) => {
    const { followerId, followingId } = req.query;
    if (!followerId || !followingId) return res.status(400).json({ error: 'IDs manquants' });
    try {
        const result = await pool.query('SELECT 1 FROM subscribe WHERE follower_id=$1 AND followed_id=$2', [followerId, followingId]);
        res.json({ isFollowing: result.rowCount > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/follow/follow', async (req, res) => {
    let { followerId, followedId } = req.body;
    if (!followerId || !followedId) return res.status(400).json({ error: 'IDs manquants' });
    if (typeof followerId === 'object' && followerId.idutilisateur) followerId = followerId.idutilisateur;
    try {
        await pool.query('INSERT INTO subscribe (follower_id, followed_id) VALUES ($1, $2)', [followerId, followedId]);
        res.json({ success: true });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Cet abonnement existe déjà' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/follow/unfollow', async (req, res) => {
    const { followerId, followedId } = req.body;
    if (!followerId || !followedId) return res.status(400).json({ error: 'IDs manquants' });
    try {
        await pool.query('DELETE FROM subscribe WHERE follower_id=$1 AND followed_id=$2', [followerId, followedId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/user/subscriptions/patrons', async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = parseInt(req.query.idutilisateur, 10);
        if (isNaN(userId) || userId <= 0) return res.status(400).json({ error: 'ID utilisateur invalide' });
        const result = await client.query(
            `SELECT patron.* FROM subscribe JOIN image ON image.idUtilisateur = subscribe.followed_id JOIN patron ON patron.idImage = image.idimage WHERE subscribe.follower_id = $1`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// ─── Creators & Recommendations ───────────────────────────────────────────────

app.post('/image/creator', async (req, res) => {
    const client = await pool.connect();
    try {
        const { idimage } = req.body;
        if (!idimage) return res.status(400).json({ error: 'L\'ID d\'image est requis' });
        const result = await client.query(
            `SELECT u.idutilisateur, u.nom FROM utilisateur u INNER JOIN image i ON u.idutilisateur = i.idutilisateur INNER JOIN patron p ON i.idimage = p.idimage WHERE p.idpatron = $1`,
            [idimage]
        );
        if (result.rows.length > 0) res.json({ idutilisateur: result.rows[0].idutilisateur, nom: result.rows[0].nom });
        else res.status(404).json({ error: 'Aucun créateur trouvé' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

app.post('/update-recommendation', async (req, res) => {
    const { id, mot, nbclick } = req.body;
    if (!id || !mot) return res.status(400).json({ error: 'Les paramètres id et mot sont requis' });
    const nbclicks = nbclick || 1;
    try {
        const client = await pool.connect();
        const checkResult = await client.query('SELECT * FROM recommandation WHERE idutilisateur=$1 AND tag=$2', [id, mot]);
        if (checkResult.rows.length > 0) {
            await client.query('UPDATE recommandation SET nbclicks = nbclicks + $1 WHERE idutilisateur=$2 AND tag=$3', [nbclicks, id, mot]);
        } else {
            await client.query('INSERT INTO recommandation (idutilisateur, tag, nbclicks) VALUES ($1, $2, $3)', [id, mot, nbclicks]);
        }
        await client.query('UPDATE recommandation SET nbclicks = 0 WHERE idutilisateur=$1 AND tag=$2 AND nbclicks < 0', [id, mot]);
        client.release();
        res.json({ message: 'Recommandation mise à jour avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── Facteurs ─────────────────────────────────────────────────────────────────

app.post('/patron/facteurs', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM facteursimage WHERE id=$1', [req.body.idimage]);
        client.release();
        if (result.rows.length > 0) res.json(result.rows[0].facteurs);
        else res.status(404).json({ error: 'Facteurs non trouvés' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/user/facteurs', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM facteursutilisateur WHERE id=$1', [req.body.idutilisateur]);
        client.release();
        res.json(result.rows.length > 0 ? result.rows[0].facteurs : null);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/user/facteurs/update', async (req, res) => {
    const { idutilisateur, facteurs } = req.body;
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const check = await client.query('SELECT * FROM facteursutilisateur WHERE id=$1', [idutilisateur]);
        if (check.rows.length > 0) {
            await client.query('UPDATE facteursutilisateur SET facteurs=$2 WHERE id=$1', [idutilisateur, facteurs]);
        } else {
            await client.query('INSERT INTO facteursutilisateur (id, facteurs) VALUES ($1, $2)', [idutilisateur, facteurs]);
        }
        await client.query('COMMIT');
        res.json({ message: 'Facteurs mis à jour avec succès' });
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        if (client) client.release();
    }
});

// ─── Azure Vision ─────────────────────────────────────────────────────────────

app.post('/azure/titleandtags', async (req, res) => {
    try {
        const { imageData } = req.body;
        if (!imageData) return res.status(400).json({ error: 'Les données de l\'image sont requises.' });
        const features = ['Description', 'Tags'];
        const result = await visionClient.analyzeImageInStream(Buffer.from(imageData, 'base64'), { visualFeatures: features });
        let description = result.description.captions[0].text;
        let tags = [];
        if (result.tags.length > 0) tags.push(result.tags[0].name);
        else tags.push(result.description.tags[0]);
        for (let i = 1; i < result.tags.length; i++) {
            if (result.tags[i].confidence > 0.8) tags.push(result.tags[i].name);
        }
        const textOfTags = tags.join(', ');
        const titrefr = await translateText(description);
        const textOfTagsFr = await translateText(textOfTags);
        res.json({ titre: titrefr, tags: textOfTagsFr.split(', ') });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération des tags et du titre' });
    }
});

async function translateText(text) {
    const url = 'http://localhost:60001/api/translate';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(`Erreur API ${res.status}`);
    const data = await res.json();
    if (data && data.translatedText) return data.translatedText;
    throw new Error('Réponse API invalide');
}

// ─── Password Reset ───────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASS || ''
    }
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM utilisateur WHERE email=$1', [email]);
        if (result.rows.length === 0) { client.release(); return res.status(400).json({ error: 'Adresse e-mail non trouvée' }); }
        const token = crypto.randomBytes(20).toString('hex');
        const expiration = Date.now() + 3600000;
        await client.query('UPDATE utilisateur SET reset_password_token=$1, reset_password_expires=$2 WHERE email=$3', [token, expiration, email]);
        client.release();
        const mailOptions = {
            to: email,
            from: process.env.MAIL_USER || '',
            subject: 'Réinitialisation de mot de passe',
            text: `Cliquez sur ce lien pour réinitialiser votre mot de passe:\n\nhttp://localhost:5173/reset-password/${token}\n\nCe lien expire dans 1 heure.`
        };
        transporter.sendMail(mailOptions, (err) => {
            if (err) return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'e-mail' });
            res.json({ message: 'E-mail de réinitialisation envoyé' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM utilisateur WHERE reset_password_token=$1 AND reset_password_expires>$2', [token, Date.now()]);
        if (result.rows.length === 0) { client.release(); return res.status(400).json({ error: 'Jeton invalide ou expiré' }); }
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        await client.query('UPDATE utilisateur SET mot_de_passe=$1, reset_password_token=NULL, reset_password_expires=NULL WHERE reset_password_token=$2', [hashedPassword, token]);
        client.release();
        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ─── Misc ─────────────────────────────────────────────────────────────────────

app.get('/currentIP', (req, res) => {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
    res.json({ ip: config.IP_API });
});

app.get('/user/dates', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(
            `SELECT idPatron, idUtilisateur, TO_CHAR(dateCreation, 'YYYY-MM-DD HH24:MI:SS.US') AS formattedDate FROM Patron ORDER BY dateCreation DESC`
        );
        client.release();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/images', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT path, idimage FROM image');
        client.release();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.listen(port, () => {
    console.log(`Backend API started on http://localhost:${port}`);
});
