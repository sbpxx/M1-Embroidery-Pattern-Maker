import os
import cv2 as cv
import numpy as np
import matplotlib.pyplot as plt
import Methodes as met
import FabriqueMatrice as fm
from stringToImg import assoToImg,VAddMatrices,enregistrer_image,entete
import Helper
from PIL import Image
import base64

#        ret = generatorPatron(chemin, longueur, largeur, k, repertoire)

#        ret = generatorPatron(imageOriginale64, longueur, largeur, k)

################## MAIN ##########################
def generatorPatron(isBase64, longueur, largeur, k, imageOriginale64 = None, chemin = None, repertoire = None):
    Helper.Helper.logInfo("-----------------Entré dans la fonction generatorPatron--------------------")

    Helper.Helper.logInfo("Verification des paramètres")

    if not isBase64:
        img = cv.imread(chemin)
    else:
        img_data = base64.b64decode(imageOriginale64)
        np_data = np.frombuffer(img_data, np.uint8)
        img = cv.imdecode(np_data, cv.IMREAD_COLOR)

    #Attentre de l'image
    Helper.Helper.logInfo("Image lue")

    if type(img) == type(None):
        Helper.Helper.logError("Erreur lors de la lecture de l'image")
        return '{"error":"Erreur lors de la lecture de l\'image"}'
    


    img_resized = met.redimensionParTaille(img, longueur, largeur)
    imgOrigine = img_resized.copy()
    Helper.Helper.logInfo("Image redimensionnée et copiée")

    # Appliquer une dilatation pour améliorer les contours
    kernel = np.ones((3, 3), np.uint8)
    img = cv.dilate(img_resized, kernel)
    Helper.Helper.logInfo("Transformation appliquée trois fois")

    # On applique la transformation plusieurs fois
    errors, results, listeCouleurs = met.CalculMSE(img, imgOrigine, 10, k)
    
    # Trouver l'image avec la plus petite erreur
    best_index = np.argmin(errors)
    best_image = results[best_index]
    listeCouleur = listeCouleurs[best_index]
    
    # print(listeCouleur)
    # print("================================================================================")
    # print(best_image)

    Helper.Helper.logDebug(str(best_index))
    Helper.Helper.logDebug(str(best_image))
    Helper.Helper.logDebug(str(listeCouleur))
    Helper.Helper.logInfo("Choix de l'image avec la plus petite erreur faite")
    # Affichage de l'image originale et de la meilleure transformation
    Helper.Helper.logInfo("Affichage de l'image originale et de la meilleure transformation")
    fig = plt.figure(figsize=(10, 7)) 
    fig.add_subplot(1, 2, 1)
    imgOrigine = imgOrigine[:,:,::-1]
    
    # Affichage de l'image originale
    plt.imshow(imgOrigine)
    plt.axis('off')
    plt.title("Image originale")
    
    # Affichage de la meilleure image transformée
    fig.add_subplot(1, 2, 2)

    if not isBase64:
        if not os.path.exists(repertoire):
            os.makedirs(repertoire)
        Helper.Helper.logInfo("Verification de l'existance du répertoire pour l'image redimensionnée, faite")
        if os.path.exists(repertoire + "/ImageResized.png"):
            os.remove(repertoire + "/ImageResized.png")
            Helper.Helper.logInfo("L'image redimensionnée existe déjà -> Image redimensionnée supprimée")
    


    img_resized = img_resized[:,:,::-1]
    best_image2 = best_image[:,:,::-1]
    patron_res, associations = met.Patron(best_image, listeCouleur)
    #print(associations[1][0])
    # Calculer la longueur de fil
    Helper.Helper.logInfo("Calcul Longueur de fil")

    if not isBase64:
        # Sauvegarde de l'image transformée
        cv.imwrite(repertoire + "/ImageResized.png", best_image2)
        Helper.Helper.logInfo("Image redimensionnée enregistrée dans le fichier")

    # Sauvegarde de l'image transformée

    # Affichage de la meilleure image après K-means
    plt.imshow(best_image)
    plt.axis('off')
    plt.title(f"Meilleure image après K-means (erreur : {errors[best_index]:.2f})")
    plt.show()
    Helper.Helper.logInfo("Affichage de l'image best_image avec un titre")
    Helper.Helper.logDebug(str("Erreur associée au K-means"))
    Helper.Helper.logDebug(str(errors[best_index]))
    
    # Générer le patron et afficher les associations
    patron_res, associations = met.Patron(best_image, listeCouleur)
    #print(associations[1][0])
    # Calculer la longueur de fil
    Helper.Helper.logInfo("Calcul Longueur de fil")
    longueur_fil = met.LongueurFils(best_image, listeCouleur)
    tabLenCouleur=[]
    for idx, longueur in longueur_fil.items():
        print(f"Couleur {idx} : {longueur:.2f} cm")
        tabLenCouleur.append(str(longueur))
    
    # Affichage structuré des associations entre les centroïdes et les motifs
    ##print("\n=== Associations entre Centroïdes et Motifs ===")
    Tab=[]
    Tab.append(entete())
    for assoc in associations:
        idx,r,g,b, motif = assoc
        Tab.append(assoToImg(assoc,tabLenCouleur[idx])) #créer image qui associe numéro du centroide avec ça forme sur le patron
    Tab2=VAddMatrices(Tab)

    if not isBase64:
        enregistrer_image(Tab2,repertoire + "/recapCouleur.png")


    # Affichage du patron
    plt.imshow(patron_res, cmap='gray')
    plt.axis('off')
    plt.title(f"Patron final (erreur : {errors[best_index]:.2f})")
    plt.show()
    Helper.Helper.logInfo("Affichage de l'image du patron avec un titre")
    Helper.Helper.logDebug(str("Erreur associée au K-means"))
    Helper.Helper.logDebug(str(errors[best_index]))

    # Sauvegarder le patron
    if not isBase64:
        if os.path.exists(repertoire + "/Patron.png"):
            os.remove(repertoire + "/Patron.png")
            Helper.Helper.logInfo("L'image patron existe déjà -> Image patron supprimée")
        cv.imwrite(repertoire + "/Patron.png", patron_res)
        Helper.Helper.logInfo("Image patron enregistrée dans le fichier")
        Helper.Helper.logDebug(str("Liste de couleur : "))
        Helper.Helper.logDebug(str(listeCouleur))



    ##print(listeCouleur)
    regions, color_count, color_size, region_perimeter = met.region_growth(best_image, connectivity=8, min_region_size=9)

    if not isBase64:
        valret = '{"patron":"'+repertoire+'/Patron.png","index":"'+repertoire+'/recapCouleur.png","aperçu":"'+repertoire+'/ImageResized.png"}'
    else:
        patron64 = base64.b64encode(cv.imencode('.png', patron_res)[1]).decode()
        recapCouleur64 = base64.b64encode(cv.imencode('.png', Tab2)[1]).decode()
        ImageResized64 = base64.b64encode(cv.imencode('.png', best_image2)[1]).decode()
        valret = '{"patron":"'+patron64+'","recapCouleur":"'+recapCouleur64+'","ImageResized":"'+ImageResized64+'"}'
    Helper.Helper.logInfo("Fin Generation Patron")

    Helper.Helper.logInfo("Fin Generation Patron")
    return valret



#ctrl+k+c ctrl+k+u
def generatorApercu(chemin, Longueur, Largueur, k, repertoire):
    Helper.Helper.logInfo("------------------Entré dans la fonction generatorApercu-------------------") 

    # Charger et redimensionner l'image
    img = cv.imread(chemin)
    imgOrigine = img.copy()
    Helper.Helper.logInfo("Image lue et copiée") 

    
    # Appliquer une dilatation pour améliorer les contours
    kernel = np.ones((3, 3), np.uint8)
    #img = cv.dilate(img, kernel)
    Helper.Helper.logInfo("Transformation appliquée trois fois")

    # On applique la transformation 3 fois
    errors, results, listeCouleurs = met.CalculMSE(img, imgOrigine, 10, 6)
    
    # Trouver l'image avec la plus petite erreur
    best_index = np.argmin(errors)
    best_image = results[best_index]
    listeCouleur = listeCouleurs[best_index]
    Helper.Helper.logDebug(str(best_index))
    Helper.Helper.logDebug(str(best_image))
    Helper.Helper.logDebug(str(listeCouleur))
    Helper.Helper.logInfo("Choix de l'image avec la plus petite erreur faite")
    # Affichage de l'image originale et de la meilleure transformation
    Helper.Helper.logInfo("Affichage de l'image originale et de la meilleure transformation")
    fig = plt.figure(figsize=(10, 7)) 
    fig.add_subplot(1, 2, 1)
    
    imgOrigine = imgOrigine[:,:,::-1]
    
    # Affichage de l'image originale
    plt.imshow(imgOrigine)
    plt.axis('off')
    plt.title("Image originale")
    
    # Affichage de la meilleure image transformée
    fig.add_subplot(1, 2, 2)
    # Sauvegarde de l'image transformée
    if not os.path.exists(repertoire):
        os.makedirs(repertoire)

    if os.path.exists(repertoire + "/ImageResized.png"):
        os.remove(repertoire + "/ImageResized.png")

    cv.imwrite(repertoire + "/ImageResized.png", best_image)
    best_image = best_image[:,:,::-1]
    
    # Affichage de la meilleure image après K-means
    plt.imshow(best_image)
    plt.axis('off')
    plt.title(f"Meilleure image après K-means (erreur : {errors[best_index]:.2f})")
    plt.show()
    valret = '{ "aperçu" : "'+repertoire+'/ImageResized.png" }'
    # Afficher les résultats
    #print(f"Liste des couleurs après K-means : {listeCouleur}")
    #print(f"Erreur pour la transformation choisie : {errors[best_index]:.2f}")
    Helper.Helper.logInfo("Fin Generation aperçu")
    return valret

# Appels des fonctions avec exemple d'utilisation
generatorPatron(False,100, 100,10,None,"./test_images/lezard.jpeg","./output")
# generatorApercu("./luffy.jpeg", 150, 100, 6, "./output")

