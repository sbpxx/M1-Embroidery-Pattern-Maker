#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Oct 21 11:30:51 2024

@author: jfo
"""
import cv2
import cv2 as cv
import numpy as np
from sklearn.cluster import KMeans
from kneed import KneeLocator
import pandas as pd
import math
from PIL import Image
import Helper
import FabriqueMatrice as Fabrice
# Fonction pour déterminer le nombre optimal de clusters K
def deterK(img):
    Helper.Helper.logInfo("-----------------Entré dans la fonction deterK----------------------")
    X = img.reshape((-1,3))
    X = pd.DataFrame(X)
    Helper.Helper.logInfo("Redimension de l'image")
    intertia_list = []
    k_list = range(1, 10)
    
    # Calcul de l'inertie pour chaque K
    for k in k_list:
        kmeans = KMeans(n_clusters=k)
        kmeans.fit(X)
        intertia_list.append(kmeans.inertia_)

    Helper.Helper.logInfo("Calcul de l'inertie pour chaque k")
    Helper.Helper.logDebug(str(intertia_list))

    kl = KneeLocator(range(0, 9), intertia_list, curve="convex", direction="decreasing")
    k_optimal = kl.elbow
    #print("Le nombre optimal de clusters est :", k_optimal)
    Helper.Helper.logInfo("Calcul du nombre optimal de cluster")
    Helper.Helper.logDebug(str(k_optimal))
    
    return k_optimal

# Fonction pour appliquer K-means
def Kmeans(img, k=None):
    Helper.Helper.logInfo("-----------------Entré dans la fonction Kmeans----------------------")
    imgRGB = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    kernel = np.ones((5, 5), np.uint8)
    cv.imwrite("./output" + "/ImgDilate.png", img)

    imgRGB = cv2.medianBlur(imgRGB, 3)  # Filtre médian sur le canal H
    cv.imwrite("./output" + "/ImgMedian.png", cv2.cvtColor(imgRGB, cv2.COLOR_RGB2BGR))

    imgRGB = cv2.erode(imgRGB, kernel)  # Érosion sur le canal H

    cv.imwrite("./output" + "/ImgMedianErode.png", cv2.cvtColor(imgRGB, cv2.COLOR_RGB2BGR))

    imgHSV = cv2.cvtColor(imgRGB, cv2.COLOR_BGR2HSV)
    
    

    # Convertir en niveaux de gris et détecter les contours
    gray = cv2.cvtColor(imgRGB, cv2.COLOR_RGB2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    cv.imwrite("./output" + "/contour.png", laplacian)
    # Déterminer k si non fourni
    if k is None:
        k = deterK(imgRGB)
        Helper.Helper.logDebug("k déterminé: " + str(k))
    else:
        Helper.Helper.logDebug("k fourni: " + str(k))

    # Sélectionner les centroïdes initiaux
    contrast_colors = select_initial_centroids(imgRGB, imgHSV, laplacian, k)
    
    # Préparation des données
    Z = imgRGB.reshape((-1, 3)).astype(np.float32)
    
    # 1. Calcul des labels initiaux explicites
    distances = np.linalg.norm(Z[:, np.newaxis] - contrast_colors, axis=2)
    initial_labels = np.argmin(distances, axis=1).astype(np.int32)
    
    # 2. Vérification cruciale
    assert np.max(initial_labels) < k, "Labels initiaux invalides"
    
    # 3. Appel à kmeans AVEC labels initiaux explicites
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    ret, label, center = cv2.kmeans(
        data=Z,
        K=k,
        bestLabels=initial_labels,  # On fournit nos labels
        criteria=criteria,
        attempts=10,
        flags=cv2.KMEANS_USE_INITIAL_LABELS
    )
    
    # Convertir les résultats
    center = np.uint8(center)
    res = center[label.flatten()]
    res2 = res.reshape(imgRGB.shape)
    

    


    return res2, center

def select_initial_centroids(img, imgHSV, laplacian, k):
    h, w, _ = img.shape
    sorted_indices = np.argsort(np.abs(laplacian.ravel()))[::-1]
    
    contrast_pixels = []
    selected_colors = []
    
    # Sous-échantillonner les indices pour réduire la densité
    sorted_indices = sorted_indices[::5]  # Prendre 1 indice sur 5
    
    for p in sorted_indices:
        y, x = divmod(p, w)
        color = imgHSV[y, x]
        
        # Vérifier la distance avec les couleurs ET la distance spatiale
        if not any(np.linalg.norm(color - c) < 50 for c in selected_colors):
            contrast_pixels.append((y, x))  # Stocker les positions (y, x)
            selected_colors.append(color)
            if len(contrast_pixels) >= k:
                break
    
    # Récupérer les couleurs RGB (pas HSV) pour les centroïdes
    contrast_colors = [img[y, x] for (y, x) in contrast_pixels]
    
    # Si pas assez de pixels contrastés, compléter avec des pixels aléatoires DISTINCTS
    if len(contrast_colors) < k:
        needed = k - len(contrast_colors)
        for _ in range(needed):
            y, x = np.random.randint(0, h), np.random.randint(0, w)
            if (y, x) not in contrast_pixels:
                contrast_pixels.append((y, x))
                contrast_colors.append(img[y, x])
    print("==============================================================================")
    print(contrast_colors)
    
    # Conversion finale et vérification
    contrast_colors = np.array(contrast_colors[:k], dtype=np.float32)
    
    print(contrast_colors)
    print("==============================================================================")

    if contrast_colors.shape != (k, 3):
        raise ValueError("La forme des centroïdes initiaux est incorrecte")
    
    return contrast_colors




# Fonction pour calculer l'erreur quadratique moyenne (MSE)
def mse(imageA, imageB):
    Helper.Helper.logInfo("-----------------Entré dans la fonction mse----------------------")

    err = np.sum((imageA.astype("float") - imageB.astype("float")) ** 2)
    err /= float(imageA.shape[0] * imageA.shape[1])
    Helper.Helper.logDebug(str(err))

    return err

def CalculMSE(imgATraite,imgOrigine, tentative,K=None):
    Helper.Helper.logInfo("-----------------Entré dans la fonction CalculMSE----------------------")
    results = []
    errors = []
    centroids = []
    for i in range(tentative):
        imgTransformed,center = Kmeans(imgATraite, K)
        results.append(imgTransformed)
        
        # Calcul de la MSE entre l'image originale et l'image transformée
        error = mse(imgOrigine, imgTransformed)
        errors.append(error)
        centroids.append(center)
        Helper.Helper.logDebug(str(error))
        Helper.Helper.logDebug("Calcul de la MSE entre l'image originale et l'image transformée fait")
        #print(f"Erreur pour la transformation {i+1} : {error}")
    return errors,results,centroids

def rechercheIDCent(pix,centroide):
    Helper.Helper.logDebug("-----------------Entré dans la fonction rechercheIDCent----------------------")

    res = -1
    for index in range(0,len(centroide)):
        test = centroide[index]
        if pix[0] == test[0] and pix[1] == test[1] and pix[2] == test[2]:
            res = index
            break
    Helper.Helper.logDebug("recherche de l'id des centroides")
    Helper.Helper.logDebug(str(res))
    return res 

def Patron(image, centroide):
    Helper.Helper.logInfo("-----------------Entré dans lrechercheIDCenta fonction Patron----------------------")

    nLongeur, nLargeur, _ = np.shape(image)
    
    # Créer une nouvelle image pour contenir le motif
    patron = np.zeros((nLongeur * 8, nLargeur * 8), dtype=np.uint8)
    Helper.Helper.logInfo("création d'une nouvelle image pour contenir le motif")

    # Créer un tableau pour associer chaque centroïde à son motif
    associations = []

    # Remplir le patron avec les formes correspondant aux centroïdes
    for i in range(nLongeur):
        for j in range(nLargeur):
            try:
                # Déterminer le centroïde auquel le pixel appartient
                idx_centroide = rechercheIDCent(image[i, j], centroide)
                
                # Si ce centroïde n'a pas encore été traité, ajouter son motif dans le tableau
                if idx_centroide not in [assoc[0] for assoc in associations]:
                    forme = Fabrice.Fabrique(idx_centroide)
                    #print("centr "+str(centroide[idx_centroide]))
                    associations.append((idx_centroide,centroide[idx_centroide][0],centroide[idx_centroide][1],centroide[idx_centroide][2], forme))
                    #associations.append((idx_centroide, forme))
                else:
                    # Obtenir la forme associée à ce centroïde via la fonction Fabrique
                    forme = Fabrice.Fabrique(idx_centroide)
                
                # Placer la forme dans le patron
                patron[i*8:(i+1)*8, j*8:(j+1)*8] = forme
            except Exception as e:
                #print(f"Une exception s'est produite : {e}")
                Helper.Helper.logError(f"Une exception s'est produite : {e}")   
    

    Helper.Helper.logInfo("Patron rempli avec les formes correspondant aux centroides")        

    # Retourne le patron et les associations
    return patron, associations


def redimensionParTaille(image, WFin, HFin):
    Helper.Helper.logInfo("-----------------Entré dans la fonction redimensionParTaille----------------------")
    
    # Vérifie si l'image est une liste, si oui, la convertir en tableau NumPy
    if isinstance(image, list):
        Helper.Helper.logInfo("L'image est une liste, conversion en tableau NumPy...")
        image = np.array(image)  # Conversion en tableau NumPy

    # Vérifier que l'image est bien un tableau NumPy
    if not isinstance(image, np.ndarray):
        Helper.Helper.logError("L'image n'est pas un tableau NumPy valide")
        raise TypeError("L'image doit être un tableau NumPy pour être utilisée avec Image.fromarray()")

    # Assurez-vous que les données sont au bon format
    image = image.astype(np.uint8)  # Conversion en uint8, nécessaire pour Image.fromarray()

    # Redimensionner l'image
    data = Image.fromarray(image)  # Créer une image à partir du tableau NumPy
    data = data.resize((WFin, HFin), Image.BILINEAR)  # Redimensionner l'image

    best_image_resized = np.array(data)  # Convertir l'image redimensionnée en tableau NumPy
    Helper.Helper.logInfo("Image redimensionnée")
    
    return best_image_resized


          
    
def redimensionParTaille2(image,WFin,HFin):
    Helper.Helper.logInfo("-----------------Entré dans la fonction redimensionParTaille2----------------------")

    data = Image.fromarray(image)
    data = data.resize((WFin,HFin))

    best_image_resized = np.array(data)
    Helper.Helper.logInfo("Image redimensionnée")

    return best_image_resized

def LongueurFils(image, centroide):
    # Définir la longueur de fil par point (par exemple, 0.5 cm par pixel)
    longueur_par_pixel = 1  # Exemple de longueur de fil nécessaire pour chaque pixel

    # Initialisation d'un dictionnaire pour stocker les longueurs de fil par couleur
    longueur_fil_par_couleur = {i: 0 for i in range(len(centroide))}

    nLongeur, nLargeur, _ = np.shape(image)

    # Parcourir chaque pixel de l'image
    for i in range(nLongeur):
        for j in range(nLargeur):
            try:
                # Trouver le centroïde associé à ce pixel
                idx_centroide = rechercheIDCent(image[i, j], centroide)
                
                # Incrémenter la longueur du fil pour cette couleur (centroïde)
                if idx_centroide != -1:
                    longueur_fil_par_couleur[idx_centroide] += longueur_par_pixel
            except Exception as e:
                print(f"Une exception s'est produite : {e}")
    
    # Afficher les résultats
    for idx, longueur in longueur_fil_par_couleur.items():
        print(f"Longueur de fil nécessaire pour le centroïde {idx} : {longueur:.2f} cm")

    return longueur_fil_par_couleur

def region_growth(image, connectivity=8, min_region_size=9):
    # Taille de l'image
    h, w, _ = image.shape
    visited = np.zeros((h, w), dtype=bool)  # Pixels déjà visités
    regions = 0

    # Dictionnaire pour compter les occurrences de chaque couleur et la taille des régions
    color_count = {}  # Compter le nombre d'occurrences de chaque couleur
    color_size = {}   # Stocker la taille des régions pour chaque couleur
    region_pixels = {}  # Stocker les pixels de chaque région pour le calcul du périmètre

    # Définir les déplacements pour 4-connexité ou 8-connexité
    if connectivity == 8:
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, 1), (1, 1), (-1, -1), (1, -1)]
    elif connectivity == 4:
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    else:
        raise ValueError("Seule la 4-connexité ou 8-connexité sont supportées dans cet exemple.")

    def flood_fill(x, y, color):
        stack = [(x, y)]
        region_pixels_list = []  # Liste pour stocker les pixels de la région
        region_pixels_count = 0
        while stack:
            cx, cy = stack.pop()
            if not (0 <= cx < h and 0 <= cy < w):  # Vérifier les limites
                continue
            if visited[cx, cy]:  # Ignorer les pixels déjà visités
                continue
            if not np.array_equal(image[cx, cy], color):  # Couleur différente
                continue

            visited[cx, cy] = True  # Marquer comme visité
            region_pixels_list.append((cx, cy))
            region_pixels_count += 1

            # Ajouter les voisins à la pile
            for dx, dy in directions:
                stack.append((cx + dx, cy + dy))

        return region_pixels_list, region_pixels_count

    # Parcourir l'image pour détecter les régions
    for x in range(h):
        for y in range(w):
            if not visited[x, y]:
                color = image[x, y]
                region_pixels_list, region_size_pixels = flood_fill(x, y, color)
                if region_size_pixels >= min_region_size:
                    regions += 1
                    color_tuple = tuple(color)  # Convertir la couleur en tuple pour l'utiliser comme clé
                    if color_tuple not in color_count:
                        color_count[color_tuple] = 1  # Première occurrence de cette couleur
                        color_size[color_tuple] = region_size_pixels  # Taille de la région en pixels
                    else:
                        color_count[color_tuple] += 1  # Ajouter une autre occurrence
                        color_size[color_tuple] += region_size_pixels  # Ajouter la taille de cette région

                    region_pixels[color_tuple] = region_pixels_list  # Ajouter les pixels pour le calcul du périmètre

    # Fonction pour calculer la longueur du fil (périmètre)
    def longueur_fil(region_pixels_list):
        perimeter = 0
        for (x, y) in region_pixels_list:
            # Vérifier les voisins du pixel pour déterminer s'il est sur le bord
            for dx, dy in directions:
                nx, ny = x + dx, y + dy
                if not (0 <= nx < h and 0 <= ny < w) or not np.array_equal(image[nx, ny], image[x, y]):
                    perimeter += 1  # Ajouter 1 pixel si un voisin est à l'extérieur ou d'une autre couleur
        return perimeter

    # Calculer la longueur de fil pour chaque région
    region_perimeter = {}
    for color_tuple, pixels_list in region_pixels.items():
        perimeter = longueur_fil(pixels_list)
        region_perimeter[color_tuple] = perimeter  # Stocker la longueur du fil pour chaque région

    # Convertir les données en DataFrame pour un affichage propre
    data = {
        'Couleur (RGB)': [f"({r}, {g}, {b})" for r, g, b in color_count.keys()],
        'Occurrences': list(color_count.values()),
        'Taille de région (px)': [color_size[color] for color in color_count.keys()],
        'Longueur du fil (cm)': [color_size[color] * 0.5 + color_count[color] * 0.5 for color in color_count.keys()]

# Taille en pixels,  # Taille en cm (1 pixel = 0.5 cm)
         # Longueur du fil en cm (1 pixel = 0.5 cm)  # Longueur du fil en cm
    }

    # Créer un DataFrame pandas
    df = pd.DataFrame(data)

    # Affichage sous forme de tableau
    print(df)

    return regions, color_count, color_size, region_perimeter


