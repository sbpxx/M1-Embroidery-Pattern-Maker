from gensim.models import Word2Vec

model = Word2Vec.load("wikipedia_word2vec_docs.model")

model.wv.save_word2vec_format("wikipedia_train.bin", binary=True)