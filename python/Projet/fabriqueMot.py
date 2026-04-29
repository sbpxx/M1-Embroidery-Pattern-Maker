import numpy as np
from lettre.A import getA
from lettre.B import getB  
from lettre.C import getC
from lettre.D import getD   
from lettre.E import getE   
from lettre.F import getF
from lettre.G import getG
from lettre.H import getH   
from lettre.I import getI
from lettre.J import getJ
from lettre.K import getK
from lettre.L import getL   
from lettre.M import getM   
from lettre.N import getN
from lettre.O import getO
from lettre.P import getP
from lettre.Q import getQ
from lettre.R import getR
from lettre.S import getS
from lettre.T import getT
from lettre.U import getU
from lettre.V import getV
from lettre.W import getW
from lettre.X import getX
from lettre.Y import getY
from lettre.Z import getZ
from lettre.esp import getEsp
from lettre._0 import get0
from lettre._1 import get1
from lettre._2 import get2
from lettre._3 import get3
from lettre._4 import get4
from lettre._5 import get5
from lettre._6 import get6
from lettre._7 import get7
from lettre._8 import get8
from lettre._9 import get9
from PIL import Image
import Helper

def fab(CodeDMC,longueurFil,Forme):
    result = []
    CodeDMC=str(CodeDMC)
    for i in range(len(CodeDMC)):
        # Ajout de chaque matrice de lettre à la liste
        result.append(Fabrique(CodeDMC[i]))
    if(len(CodeDMC)<5):
        for i in range(5-len(CodeDMC)):
            result.append(Fabrique(' '))
    
    for i in range(len(longueurFil)):
        result.append(Fabrique(longueurFil[i]))
    if(len(longueurFil)<8):
        for i in range(8-len(longueurFil)):
            result.append(Fabrique(' '))
    
    # Coller toutes les matrices ensemble sur l'axe 1 (horizontalement)
    result.append(Fabrique(' '))

    
    
    result.append(Forme)
    
    for i in range(4):
        result.append(Fabrique(' '))
    return coller_matrices(result, axe=1)

def fabEntete():
    result= []
    dmc="DMC"
    for i in range(len(dmc)):
        # Ajout de chaque matrice de lettre à la liste
        result.append(Fabrique(dmc[i]))
    if(len(dmc)<5):
        for i in range(5-len(dmc)):
            result.append(Fabrique(' '))

    lFil="Cm"  
    for i in range(len(lFil)):
        result.append(Fabrique(lFil[i]))
    if(len(lFil)<8):
        for i in range(8-len(lFil)):
            result.append(Fabrique(' '))
    result.append(Fabrique(' '))

    motif="Motif"
    for i in range(len(motif)):
        result.append(Fabrique(motif[i]))
    if(len(motif)<5):
        for i in range(5-len(motif)):
            result.append(Fabrique(' '))
    return coller_matrices(result, axe=1)

def coller_matrices(matrices, axe=0):
    try:
        return np.concatenate(matrices, axis=axe)
    except ValueError as e:
        Helper.Helper.logError(f"Erreur lors de la concaténation : {e}")
        #print(f"Erreur lors de la concaténation : {e}")
        return None

def Fabrique(choix):
    result = []
    # Remplace les appels incorrects à `lettre.A()`, `lettre.B()`, etc.
    if choix == 'a' or choix == 'A':
        result = getA()
    elif choix == 'b' or choix == 'B':
        result = getB()
    elif choix == 'c' or choix == 'C':
        result = getC()
    elif choix == 'd' or choix == 'D':
        result = getD()
    elif choix == 'e' or choix == 'E':
        result = getE()
    elif choix == 'f' or choix == 'F':
        result = getF()
    elif choix == 'g' or choix == 'G':
        result = getG()
    elif choix == 'h' or choix == 'H':
        result = getH()
    elif choix == 'i' or choix == 'I':
        result = getI()
    elif choix == 'j' or choix == 'J':
        result = getJ()
    elif choix == 'k' or choix == 'K':
        result = getK()
    elif choix == 'l' or choix == 'L':
        result = getL()
    elif choix == 'm' or choix == 'M':
        result = getM()
    elif choix == 'n' or choix == 'N':
        result = getN()
    elif choix == 'o' or choix == 'O':
        result = getO()
    elif choix == 'p' or choix == 'P':
        result = getP()
    elif choix == 'q' or choix == 'Q':
        result = getQ()
    elif choix == 'r' or choix == 'R':
        result = getR()
    elif choix == 's' or choix == 'S':
        result = getS()
    elif choix == 't' or choix == 'T':
        result = getT()
    elif choix == 'u' or choix == 'U':
        result = getU()
    elif choix == 'v' or choix == 'V':
        result = getV()
    elif choix == 'w' or choix == 'W':
        result = getW()
    elif choix == 'x' or choix == 'X':
        result = getX()
    elif choix == 'y' or choix == 'Y':
        result = getY()
    elif choix == 'z' or choix == 'Z':
        result = getZ()
    elif choix == '0':
        result = get0()
    elif choix == '1':
        result = get1()
    elif choix == '2':
        result = get2()
    elif choix == '3':
        result = get3()
    elif choix == '4':
        result = get4()
    elif choix == '5':
        result = get5()
    elif choix == '6':
        result = get6()
    elif choix == '7':
        result = get7()
    elif choix == '8':
        result = get8()
    elif choix == '9':
        result = get9()
    else:
        result = getEsp()  # Cas par défaut
    return result
