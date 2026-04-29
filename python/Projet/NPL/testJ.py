from gensim.models import KeyedVectors

# Charger le modèle Word2Vec
chemin_du_modele = "wikipedia_train.bin"
model = KeyedVectors.load_word2vec_format(chemin_du_modele, binary=True, limit=50000)  # Limite à 50 000 mots

# Mot cible
mot_cible ="nature"

# Vérifier si le mot est dans le vocabulaire du modèle
if mot_cible in model:
    mots_proches = model.most_similar(mot_cible, topn=100)
    print(f"\nLes mots les plus proches de '{mot_cible}' sont :")
    for mot, similarite in mots_proches:
        print(f"{mot}: {similarite:.4f}")
else:
    
    print(f"Le mot '{mot_cible}' n'est pas dans le vocabulaire du modèle.")
