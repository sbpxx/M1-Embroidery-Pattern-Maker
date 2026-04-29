#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from dotenv import load_dotenv
from projet import generatorPatron, generatorApercu
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS  # Importer flask_cors
from gensim.models import KeyedVectors
#from generationTags import generate_info_from_image, ImageAnalyzer
import traceback
from deep_translator import GoogleTranslator
from recommandation_facteurs.ajoutFacteur import defFact
from recommandation_facteurs.ajustement import ajustement
from recommandation_facteurs.affichage import affichageRec



# Charger les variables d'environnement sauf en production
if os.environ.get('ENV') != 'production':
    load_dotenv()

# Créer une app Flask
app = Flask(__name__)
CORS(app)


# Route "/api/getPre" (POST) pour obtenir une prévisualisation
@app.route('/api/getPre', methods=['POST'])
def get_previsualisation():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Requête invalide, aucun JSON reçu"}), 400

        chemin = data.get('chemin')
        params = data.get('param', {})

        if not chemin or not all(k in params for k in ["longueur", "largeur", "k", "repertoire"]):
            return jsonify({"error": "Paramètres manquants"}), 400

        longueur = int(params["longueur"])
        largeur = int(params["largeur"])
        k = int(params["k"])
        repertoire = params["repertoire"]

        ret = generatorApercu(chemin, longueur, largeur, k, repertoire)
        return jsonify(ret)  # S'assurer que la réponse est un JSON

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Route "/api/traitement" (POST) pour traiter une image (Grace a des données en base 64)
@app.route('/api/traitement', methods=['POST'])
def traitement():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Requête invalide, aucun JSON reçu"}), 401

        imageOriginale64 = data.get('imageOriginale64')
        params = data.get('param', {})

        if not imageOriginale64 or not all(k in params for k in ["longueur", "largeur", "k"]):
            return jsonify({"error": "Paramètres manquants"}), 402

        longueur = int(params["longueur"])
        largeur = int(params["largeur"])
        k = int(params["k"])

        ret = generatorPatron(True, longueur, largeur, k, imageOriginale64 = imageOriginale64)
        return jsonify(ret)  # Assurer que Flask renvoie du JSON

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
# Route "/api/traitementV2" (POST) pour traiter une image (Grace a des chemins)
@app.route('/api/traitementV2', methods=['POST'])
def traitement_v2():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Requête invalide, aucun JSON reçu"}), 400

        chemin = data.get('chemin')
        params = data.get('param', {})

        if not chemin or not all(k in params for k in ["longueur", "largeur", "k", "repertoire"]):
            return jsonify({"error": "Paramètres manquants"}), 400

        longueur = int(params["longueur"])
        largeur = int(params["largeur"])
        k = int(params["k"])
        repertoire = params["repertoire"]

        ret = generatorPatron(False, longueur, largeur, k, chemin = chemin, repertoire = repertoire)
        return jsonify(ret)  # Assurer que Flask renvoie du JSON

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/getAlternativesWord', methods=['POST'])
def getAlternativeWord():
    data = request.get_json()
    mot_cible = data.get('mot')
    # Charger le modèle Word2Vec français avec un vocabulaire limité
    chemin_du_modele = "./dataset/model.bin"  # Remplace par le vrai chemin
    model = KeyedVectors.load_word2vec_format(chemin_du_modele, binary=True, limit=50000)  # Limite à 50 000 mots

    # Vérifier si le mot est dans le vocabulaire du modèle
    if mot_cible in model:
        mots_proches = model.most_similar(mot_cible, topn=50)
        print(f"\nLes mots les plus proches de '{mot_cible}' sont :")
        for mot, similarite in mots_proches:
            print(f"{mot}: {similarite:.4f}")
    else:
        mots_proches = []
        print(f"Le mot '{mot_cible}' n'est pas dans le vocabulaire du modèle.")
    return jsonify(mots_proches)


#OBSELÈTE PASSAGE PAR API AZURE VISION POUR ANALYSE D'IMAGE
# @app.route('/api/getInfoFromImage', methods=['POST'])
# def getInfoFromImage():
#     data = request.get_json()
#     print(data)
#     chemin_image = data.get('chemin_image')
#     info = generate_info_from_image(analyzer, chemin_image)
#     return jsonify(info)


# Traduire du texte anglais en français
@app.route('/api/translate', methods=['POST'])
def translate_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Requête invalide, aucun texte à traduire"}), 400

        text = data['text']
        translated = GoogleTranslator(source='en', target='fr').translate(text)
        return jsonify({"translatedText": translated})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/getTheme', methods=['POST'])
def getTheme():
    try:
        data = request.get_json()
        if not data or 'tags' not in data:
            return jsonify({"error": "Requête invalide, aucun texte à traduire"}), 400
        tags = data['tags']
        # Charger le modèle Word2Vec français avec un vocabulaire limité
        listeThemes = defFact(tags)
        # Liste des thèmes
        return jsonify({"themes": listeThemes})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    




# Route pour modifier le facteur d'un utilisateur
@app.route('/api/modifierFacteur', methods=['POST'])
def modifier_facteur_utilisateur():
    try:
        data = request.get_json()  # Récupérer les données JSON envoyées dans la requête
        if not data or 'note' not in data or 'facteur_utilisateur' not in data or 'facteur_image' not in data:
            return jsonify({"error": "Requête invalide, données manquantes"}), 400

        note = data['note']
        facteur_utilisateur = data['facteur_utilisateur']
        facteur_image = data['facteur_image']

        # Logique de traitement ici
        print(f"Note: {note}, Facteur utilisateur: {facteur_utilisateur}, Facteur image: {facteur_image}")

        listeThemes = ajustement(facteur_image, facteur_utilisateur, note)
        return jsonify({"themes": listeThemes}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    

    
@app.route('/api/recommendation', methods=['POST'])
def recommendation():
    try:
        data = request.get_json()
        if not data or 'idutilisateur' not in data or 'facteursUtilisateur' not in data or 'facteursImage' not in data:
            return jsonify({"error": "Requête invalide, données manquantes"}), 400

        id_utilisateur = data['idutilisateur']
        facteurs_utilisateur = data['facteursUtilisateur']
        facteurs_image = data['facteursImage']

        # Logique de traitement ici
        print(f"ID Utilisateur: {id_utilisateur}, Facteurs utilisateur: {facteurs_utilisateur}, Facteurs image: {facteurs_image}")

        # Appeler la fonction de recommandation ici
        listID = affichageRec(facteurs_utilisateur, facteurs_image)

        print("Liste des IDs recommandés :", listID)

        return jsonify({"recommendations": listID}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=60001, debug=True)
