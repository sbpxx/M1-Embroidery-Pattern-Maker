from gensim.models import Word2Vec

# Charger le modèle
model = Word2Vec.load("wikipedia_word2vec_docs.model")


# Trouver les 10 mots les plus similaires à "ordinateur"
similar_words = model.wv.most_similar("agriculture", topn=10)
print(similar_words)
