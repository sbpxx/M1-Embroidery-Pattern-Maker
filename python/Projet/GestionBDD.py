#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Dec 11 14:48:24 2024

@author: jf449729
"""

import os
import psycopg2

def rgbToDMC(r,v,b):
    try:
        conn = psycopg2.connect(
            user = os.getenv("DB_USER", "postgres"),
            password = os.getenv("DB_PASS", ""),
            host = os.getenv("DB_HOST", "localhost"),
            port = os.getenv("DB_PORT", "5432"),
            database = os.getenv("DB_NAME", "les_brodeurs")
        )
        
        
        cur = conn.cursor()
        retourval = ""
        sql = f"SELECT codedmc from couleur where r = {r} AND g = {v} AND b = {b};"
        cur.execute(sql)
        print("Sélectionner des lignes dans la table person")
        res = cur.fetchall() 
        
        if( len(res) > 0):
            for row in res:
                print("CodeDMC = ", row[0] , "\n")
                retourval = row[0]
        else:
            print(f"c'est pas présent r={r} v={v} b={b}")
            cptrmin = 1
            cptrmax = 1
            cptvmin = 1
            cptvmax = 1
            cptbmin = 1
            cptbmax = 1
            rmax = r
            bmax = b
            vmax = v
            rmin = r
            bmin = b
            vmin = v
            modif = True
            while((len(res) < 1) and modif):
                modif = False
                if (r-cptrmin > 0):
                    rmin = r- cptrmin
                    modif = True
                    cptrmin += 1
                if (r+cptrmax < 255):
                    rmax = r+ cptrmax
                    modif = True
                    cptrmax += 1
                if (v-cptvmin > 0):
                    vmin = v- cptvmin
                    modif = True
                    cptvmin += 1
                if (v+cptvmax < 255):
                    vmax = v+ cptvmax
                    modif = True
                    cptvmax += 1
                if (b-cptbmin > 0):
                    bmin = b- cptbmin
                    modif = True
                    cptbmin += 1
                if (b+cptbmax < 255):
                    bmax = b+ cptbmax
                    modif = True
                    cptbmax += 1
                sql = f"SELECT codedmc from couleur where r < {rmax} AND r > {rmin} AND g < {vmax} AND g > {vmin} AND b > {bmin} AND b < {bmax} LIMIT 1;"
                cur.execute(sql)
                res = cur.fetchall()
                #cpt +=1
                print(f"rmin = {rmin};rmax = {rmax};bmin = {bmin};bmax = {bmax};vmin = {vmin};vmax = {vmax};") 
                #print(len(res))
            for row in res:
                print("CodeDMC = ", row[0] , "\n")
                retourval = row[0] 

        #fermeture de la connexion à la base de données
        cur.close()
        conn.close()
        print("La connexion PostgreSQL est fermée")
    except (Exception, psycopg2.Error) as error :
        print ("Erreur lors de la connexion à PostgreSQL", error)
    return retourval;
