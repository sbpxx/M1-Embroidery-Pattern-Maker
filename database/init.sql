-- ============================================================
--  Les Brodeurs — Local database setup script
--  Run: psql -U postgres -f database/init.sql
-- ============================================================

-- Create the database (run separately as a superuser if needed)
-- CREATE DATABASE les_brodeurs;
-- \c les_brodeurs

-- ─── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS utilisateur (
    idutilisateur        SERIAL PRIMARY KEY,
    nom                  TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    mot_de_passe         TEXT NOT NULL,
    datecreation         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bio                  TEXT,
    photoprofil          TEXT,
    reset_password_token TEXT,
    reset_password_expires BIGINT
);

CREATE TABLE IF NOT EXISTS image (
    idimage      SERIAL PRIMARY KEY,
    idutilisateur INT NOT NULL REFERENCES utilisateur(idutilisateur) ON DELETE CASCADE,
    image        TEXT,
    dateimport   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    path         TEXT
);

CREATE TABLE IF NOT EXISTS patron (
    idpatron     SERIAL PRIMARY KEY,
    nom          TEXT NOT NULL,
    description  TEXT,
    idimage      INT REFERENCES image(idimage) ON DELETE SET NULL,
    nbfil        INT,
    patron       TEXT,
    tag          TEXT[],
    imageresize  TEXT,
    hauteur      INT,
    largeur      INT,
    symbole      TEXT,
    visible      BOOLEAN NOT NULL DEFAULT TRUE,
    datecreation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note (
    idutilisateur INT NOT NULL REFERENCES utilisateur(idutilisateur) ON DELETE CASCADE,
    idpatron      INT NOT NULL REFERENCES patron(idpatron) ON DELETE CASCADE,
    note          INT NOT NULL CHECK (note BETWEEN 1 AND 5),
    PRIMARY KEY (idutilisateur, idpatron)
);

CREATE TABLE IF NOT EXISTS subscribe (
    follower_id  INT NOT NULL REFERENCES utilisateur(idutilisateur) ON DELETE CASCADE,
    followed_id  INT NOT NULL REFERENCES utilisateur(idutilisateur) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, followed_id)
);

CREATE TABLE IF NOT EXISTS facteursutilisateur (
    id       INT PRIMARY KEY REFERENCES utilisateur(idutilisateur) ON DELETE CASCADE,
    facteurs JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS facteursimage (
    id       INT PRIMARY KEY REFERENCES image(idimage) ON DELETE CASCADE,
    facteurs JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS recommandation (
    idutilisateur INT  NOT NULL REFERENCES utilisateur(idutilisateur) ON DELETE CASCADE,
    tag           TEXT NOT NULL,
    nbclicks      INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (idutilisateur, tag)
);

-- ─── Seed data ───────────────────────────────────────────────
-- Passwords are SHA-256 of "password123"
-- SHA-256("password123") = ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f

INSERT INTO utilisateur (nom, email, mot_de_passe, bio) VALUES
  ('Alice Dupont', 'alice@example.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Passionnée de broderie depuis 10 ans.'),
  ('Bob Martin',  'bob@example.com',   'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'Brodeur amateur, fan de motifs géométriques.')
ON CONFLICT DO NOTHING;

-- Default facteurs for each user
INSERT INTO facteursutilisateur (id, facteurs)
SELECT idutilisateur,
       '{"art":0,"autre":0,"fleur":0,"manga":0,"sport":0,"animal":0,"astres":0,"vidéo":0,"paysage":0,"aquatique":0,"forestier":0,"véhicule":0,"nourriture":0,"informatique":0,"architectural":0,"biodiversité":0}'::jsonb
FROM utilisateur
ON CONFLICT DO NOTHING;

-- Placeholder 1×1 transparent PNG (base64)
-- Replace these with real image data if you want visible thumbnails.
DO $$
DECLARE
  placeholder TEXT := 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  uid1 INT;
  uid2 INT;
  iid1 INT;
  iid2 INT;
BEGIN
  SELECT idutilisateur INTO uid1 FROM utilisateur WHERE email = 'alice@example.com';
  SELECT idutilisateur INTO uid2 FROM utilisateur WHERE email = 'bob@example.com';

  INSERT INTO image (idutilisateur, image) VALUES (uid1, placeholder) RETURNING idimage INTO iid1;
  INSERT INTO image (idutilisateur, image) VALUES (uid2, placeholder) RETURNING idimage INTO iid2;

  INSERT INTO facteursimage (id, facteurs) VALUES
    (iid1, '{"art":0,"fleur":3,"animal":1}'::jsonb),
    (iid2, '{"art":2,"manga":1,"sport":0}'::jsonb);

  INSERT INTO patron (nom, description, idimage, nbfil, tag, imageresize, hauteur, largeur, visible) VALUES
    ('Fleur de cerisier', 'Un délicat motif de sakura',        iid1, 12, ARRAY['fleur','art'],        placeholder, 100, 100, TRUE),
    ('Dragon géométrique','Motif inspiré des mangas japonais', iid2, 24, ARRAY['manga','art','animal'],placeholder, 150, 200, TRUE);
END $$;

-- A follow: bob follows alice
INSERT INTO subscribe (follower_id, followed_id)
SELECT u2.idutilisateur, u1.idutilisateur
FROM utilisateur u1, utilisateur u2
WHERE u1.email = 'alice@example.com' AND u2.email = 'bob@example.com'
ON CONFLICT DO NOTHING;

-- A note: alice rates the first patron 4/5
INSERT INTO note (idutilisateur, idpatron, note)
SELECT u.idutilisateur, p.idpatron, 4
FROM utilisateur u, patron p
WHERE u.email = 'alice@example.com' AND p.nom = 'Fleur de cerisier'
ON CONFLICT DO NOTHING;
