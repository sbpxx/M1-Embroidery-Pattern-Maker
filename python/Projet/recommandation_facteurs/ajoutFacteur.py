import json
import numpy as np
from gensim.models import KeyedVectors

def defFact(tags):

    model = KeyedVectors.load_word2vec_format("recommandation_facteurs/wikipedia_train.bin", binary=True)
    print(tags)
    deter=["animal","architectural","biodiversité","aquatique","nourriture","astres","forestier","art","informatique","vidéo","sport","véhicule","manga","paysage","fleur"]
    dico = {m:0 for m in deter}
    paires = [(mot,tag) for mot in deter for tag in tags]
    for mot,tag in paires:
        dico[mot]+=getSimilarite(mot,tag,model)
    dico = scoring(dico)
    return dico

def getSimilarite(terme,tag,model):
    if terme in model.key_to_index and tag in model.key_to_index:
        return model.similarity(terme,tag)
    return 0

def scoring(dico):
    max_value = max(dico.values())
    if max_value < 0.05*len(dico):
        return {"autre":5}
    for key in dico.keys():
        dico[key] = dico[key] / max_value
        dico[key] = dico[key] * 5
    top_3 = dict(sorted(dico.items(), key=lambda item: item[1], reverse=True)[:3])
    return top_3
