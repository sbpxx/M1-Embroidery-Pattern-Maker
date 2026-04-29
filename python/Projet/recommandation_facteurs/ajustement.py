import numpy as np

deter = ["animal", "architectural", "biodiversité", "aquatique", "nourriture", "astres",
         "forestier", "art", "informatique", "vidéo", "sport", "véhicule",
         "manga", "paysage", "fleur", "autre"]

def ajustement(image, user, note):
    if image is None:
        return user

    if user is None:
        user = {key: 0 for key in deter}

    valeursi = list(image.values())
    if not valeursi or sum(valeursi) == 0:
        return user

    # Note prévue par les goûts de l’utilisateur
    notei = sum(user.get(k, 0) * image.get(k, 0) for k in image) / sum(valeursi)
    err = note - notei

    for key in image:
        if key in user:
            user[key] += 0.01 * err * image[key]
            user[key] = round(max(0, min(5, user[key])), 2)

    return user