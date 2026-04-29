#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os

import numpy as np
from PIL import Image
from fabriqueMot import fab,fabEntete
from GestionBDD import rgbToDMC
from Methodes import redimensionParTaille

def enregistrer_image(matrice, nom_fichier):
    # Convertir la matrice en format image (uint8 pour les pixels 0-255)
    image = Image.fromarray(matrice.astype(np.uint8))
    image = image.resize((300,300))
    # Sauvegarder l'image
    if not os.path.exists("imageAsso"):
        os.makedirs("imageAsso")
    image.save(nom_fichier)
    #print(f"L'image a été enregistrée sous le nom : {nom_fichier}")


def assoToImg(assoc,longueurFils):
    # Exemple d'utilisation
    idx, r, g, b, motif = assoc
    motif = np.array(motif)  # Assurez-vous que motif est un tableau NumPy

    motif = redimensionParTaille(motif, 16, 16)
    codeDMC = rgbToDMC(r, g, b)
    m = fab(codeDMC,longueurFils, motif)
    
    return m


def entete():  
    m = fabEntete()
    return m


def VAddMatrices(Tab):
    C=np.array(Tab[0])
    for i in range(1,len(Tab)):
        A=np.array(Tab[i])
        C=np.vstack((C,A))
    return C