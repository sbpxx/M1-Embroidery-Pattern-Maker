# from transformers import BlipProcessor, BlipForConditionalGeneration, MarianMTModel, MarianTokenizer, set_seed
# from PIL import Image
# import spacy
# import torch
# import time

# def remove_special_tags(tags):
#     special_tags = ["caméra", "arriere-plan", "photo", "image", "photographie"]
#     tags_list = tags.split()
#     filtered_tags = [tag for tag in tags_list if tag not in special_tags]
#     return " ".join(filtered_tags)

# class ImageAnalyzer:
#     def __init__(self):
#         # Initialiser les modèles
#         print("Chargement des modèles...")
#         start_time = time.time()
#         self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
#         self.blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
#         self.blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base").to(self.device)

#         # Modèle de traduction EN->FR
#         self.translator_tokenizer = MarianTokenizer.from_pretrained("Helsinki-NLP/opus-mt-en-fr")
#         self.translator_model = MarianMTModel.from_pretrained("Helsinki-NLP/opus-mt-en-fr").to(self.device)

#         # Charger le modèle spaCy pour l'analyse des mots en français
#         self.nlp_fr = spacy.load("fr_core_news_sm")

#         print(f"Modèles chargés avec succès. Temps écoulé: {time.time() - start_time:.2f}s")

#     def translate_text(self, text):
#         # Tokeniser le texte anglais
#         inputs = self.translator_tokenizer(text, return_tensors="pt", padding=True).to(self.device)

#         # Générer la traduction
#         translated = self.translator_model.generate(**inputs)

#         # Décoder la traduction
#         return self.translator_tokenizer.decode(translated[0], skip_special_tokens=True)

#     def extract_info_from_image(self, image_path):
#         # Charger l'image
#         image = Image.open(image_path)

#         print("Génération de la description de l'image...")
#         start_time = time.time()

#         # Générer la description en anglais
#         inputs = self.blip_processor(images=image, return_tensors="pt").to(self.device)
#         out = self.blip_model.generate(**inputs, min_length=15, max_length=25, num_beams=4, early_stopping=True, no_repeat_ngram_size=2)
#         description = self.blip_processor.decode(out[0], skip_special_tokens=True)

#         # Traduire en français
#         print(f"Traduction de la description... Temps écoulé: {time.time() - start_time:.2f}s")
#         description_fr = self.translate_text(description)

#         # Générer un titre court
#         print("Génération du titre...")
#         start_time = time.time()
#         out = self.blip_model.generate(**inputs, max_length=10, num_beams=4, no_repeat_ngram_size=2)
#         title = self.blip_processor.decode(out[0], skip_special_tokens=True)

#         print(f"Traduction du titre... Temps écoulé: {time.time() - start_time:.2f}s")
#         title_fr = self.translate_text(title)

#         # Extraire les mots-clés (tags) en français
#         print("Génération des tags...")
#         start_time = time.time()
#         out1 = self.blip_model.generate(**inputs, max_length=100, num_beams=1, no_repeat_ngram_size=0, min_length=15, top_k=50, top_p=0.9, temperature=0.1, do_sample=True)
#         out2 = self.blip_model.generate(**inputs, max_length=100, num_beams=1, no_repeat_ngram_size=0, min_length=15, top_k=50, top_p=0.9, temperature=0.3, do_sample=True)
#         out3 = self.blip_model.generate(**inputs, max_length=100, num_beams=1, no_repeat_ngram_size=0, min_length=15, top_k=50, top_p=0.9, temperature=0.2, do_sample=True)
#         out4 = self.blip_model.generate(**inputs, max_length=100, num_beams=1, no_repeat_ngram_size=0, min_length=15, top_k=50, top_p=0.9, temperature=0.35, do_sample=True)
#         out5 = self.blip_model.generate(**inputs, max_length=100, num_beams=1, no_repeat_ngram_size=0, min_length=15, top_k=50, top_p=0.9, temperature=0.05, do_sample=True)
#         tags = ""
#         out = [out1, out2, out3, out4, out5]
#         for i in range(5):
#             tags += self.blip_processor.decode(out[i][0], skip_special_tokens=True) + "\n"

#         tags = remove_special_tags(tags)

#         print(f"tags: {tags}")
#         print(f"Extraction des tags... Temps écoulé: {time.time() - start_time:.2f}s")
#         tags_fr = self.extract_tags_fr(self.translate_text(tags))
#         return {
#             "title": title_fr,
#             "description": description_fr,
#             "tags": tags_fr
#         }

#     def extract_tags_fr(self, text):
#         doc = self.nlp_fr(text)
#         keywords = [token.text.lower() for token in doc if token.pos_ in ["NOUN", "PROPN", "ADJ"]]
#         # Retourne les 5 mots les plus fréquents
#         keyword_count = {}
#         for keyword in keywords:
#             if keyword in keyword_count:
#                 keyword_count[keyword] += 1
#             else:
#                 keyword_count[keyword] = 1
#         tagsDict = sorted(keyword_count, key=keyword_count.get, reverse=True)
#         ##Afficher
#         for tag in tagsDict:
#             print(tag, keyword_count[tag])
#         return tagsDict[:5]

# def generate_info_from_image(analyzer, image_path):
#     return analyzer.extract_info_from_image(image_path)