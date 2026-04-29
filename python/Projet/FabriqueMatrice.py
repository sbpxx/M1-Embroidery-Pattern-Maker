#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Oct 22 13:36:12 2024

@author: jfo
"""
import formesMatrice.Plus as plus
import formesMatrice.Rond as rond
import formesMatrice.TraitHorizontale as traith
import formesMatrice.TraitVertical as traitw
import formesMatrice.Triangle as triangle
import formesMatrice.demiRondHaut as demiRondH
import formesMatrice.Carre as carre
import formesMatrice.DemiRondBas as demiRondB
import formesMatrice.DemiRondDroit as demiRondD
import formesMatrice.DemiRondGauche as demiRondG
import formesMatrice.angleBD as angleBD
import formesMatrice.angleHG as angleHG

def Fabrique(choix):
    result = []
    match choix:
        case 0:
            result = demiRondH.getDemiRondHaut()
        case 1:
            result = plus.getPlus()
        case 2:
            result = traith.getTraitHorizontale()
        case 3:
            result = traitw.getTraitVertical()
        case 4:
            result = triangle.getTriangle()
        case 5:
            result = carre.getCarre()
        case 6:
            result = demiRondB.getDemiRondBas()
        case 7:
            result = demiRondD.getDemiRondDroit()
        case 8:
            result = demiRondG.getDemiRondGauche()
        case 9:
            result = angleBD.getAngleBD()
        case 10:
            result = angleHG.getAngleBD()
        case _:
            result = rond.getRond()
    return result
