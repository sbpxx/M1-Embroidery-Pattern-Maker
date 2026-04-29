from math import sqrt

def to_vector(dico, reference_keys):
    return [dico.get(k, 0) for k in reference_keys]

def cosine_similarity(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = sqrt(sum(a * a for a in v1))
    norm2 = sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0
    return dot / (norm1 * norm2)

def affichageRec(facteurs_utilisateur, images):
    reference_keys = list(facteurs_utilisateur.keys())
    ref_vec = to_vector(facteurs_utilisateur, reference_keys)

    similarites = {}
    for img in images:
        fact = img.get('facteurs')
        if fact is not None:
            vec = to_vector(fact, reference_keys)
            sim = cosine_similarity(vec, ref_vec)
            similarites[img['id']] = sim

    # Retourne les IDs triés par similarité décroissante
    return list(sorted(similarites, key=similarites.get, reverse=True))



utilisateur= {'art': 0.1, 'autre': 0.33, 'fleur': 0, 'manga': 0, 'sport': 0, 'animal': 0, 'astres': 0, 'vidéo': 0, 'paysage': 0.06, 'aquatique': 0, 'forestier': 0, 'véhicule': 0, 'nourriture': 0, 'informatique': 0, 'architectural': 0.06, 'biodiversité': 0}
image= [{'id': 191, 'facteurs': {'art': 5, 'fleur': 1.7704405252061148, 'manga': 2.4717567687186555, 'sport': 2.45451179401011, 'animal': 2.5440858663680155, 'astres': 1.917829650163751, 'vidéo': 2.4703035417286685, 'aquatique': 1.8720223006130896, 'forestier': 1.5882455534271487, 'véhicule': 2.672894779688117, 'nourriture': 2.4175463565374047, 'informatique': 2.4742861738884807, 'architectural': 3.136235179625979, 'biodiversité': 1.515683134412571}}, {'id': 192, 'facteurs': None}, {'id': 193, 'facteurs': None}, {'id': 194, 'facteurs': None}, {'id': 195, 'facteurs': None}, {'id': 196, 'facteurs': None}, {'id': 197, 'facteurs': None}, {'id': 198, 'facteurs': None}, {'id': 199, 'facteurs': None}, {'id': 200, 'facteurs': {'autre': 5}}, {'id': 201, 'facteurs': {'autre': 5}}, {'id': 202, 'facteurs': None}, {'id': 203, 'facteurs': {'art': 5, 'paysage': 3.1329948043440674, 'architectural': 3.136235179625979}}, {'id': 204, 'facteurs': None}, {'id': 205, 'facteurs': {'autre': 5}}, {'id': 206, 'facteurs': {'autre': 5}}, {'id': 207, 'facteurs': None}, {'id': 208, 'facteurs': None}, {'id': 209, 'facteurs': None}, {'id': 210, 'facteurs': None}, {'id': 211, 'facteurs': None}, {'id': 212, 'facteurs': None}, {'id': 213, 'facteurs': None}, {'id': 214, 'facteurs': None}]

resultat = affichageRec(utilisateur, image)
print(resultat)
