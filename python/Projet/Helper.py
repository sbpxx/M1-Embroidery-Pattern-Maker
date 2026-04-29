#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Nov  4 11:04:49 2024

@author: mmo
"""

from datetime import datetime
import os
import inspect
import json


class Helper:
    # Charger le mode debug une seule fois
    try:
        with open('param.json', 'r') as f:
            params = json.load(f)
            debug_mode = params.get('debug', False)
    except FileNotFoundError:
        print("\033[31m[Erreur]\033[0m Fichier param.json non trouvé")
        debug_mode = False
    except json.JSONDecodeError:
        print("\033[31m[Erreur]\033[0m Erreur de décodage JSON dans param.json")
        debug_mode = False


    @staticmethod
    def logInfo(msg):
        now = datetime.now().time()
        caller_frame = inspect.stack()[1]
        caller_name = caller_frame.function
        print("\033[34m[info]\033[0m "+str(now)+" "+caller_name+" => "+ msg)
        ecritureLog("[info] "+str(now)+" "+caller_name+" => " + msg)
    @staticmethod
    def logDebug(msg):
        if Helper.debug_mode:
            now = datetime.now().time()
            caller_frame = inspect.stack()[1]
            caller_name = caller_frame.function
            print("\033[35m[Debug]\033[0m "+str(now)+" "+caller_name+" => "+ msg)
            ecritureLog("[Debug] "+str(now)+" "+caller_name+" => " +msg)
    @staticmethod
    def logError(msg):
        now = datetime.now().time()
        caller_frame = inspect.stack()[1]
        caller_name = caller_frame.function
        print("\033[31m[Erreur]\033[0m "+str(now)+" "+caller_name+" => " + msg)
        ecritureLog("[Erreur] "+str(now)+" "+caller_name+" => " +msg)
    @staticmethod
    def logWarn(msg):
        now = datetime.now().time()
        caller_frame = inspect.stack()[1]
        caller_name = caller_frame.function
        print("\033[32m[Warning]\033[0m "+str(now)+" "+caller_name+" => " + msg)

        ecritureLog("[Warning] "+str(now)+" "+caller_name+" => " + msg)
    
def ecritureLog(msg):
    now = datetime.now()

    # Formater la date et l'heure
    date_str = now.strftime("%Y%m")
    date_str2 = now.strftime("%d")
    
    if not os.path.exists("logs"):
        os.makedirs("logs")
    

    if not os.path.exists("logs/"+date_str):
        os.makedirs("logs/"+date_str)
    
    # Utiliser le mode 'a' pour ajouter des logs sans écraser le fichier
    with open("logs/"+date_str+"/"+date_str2+'.txt', 'a') as fichier:
        fichier.write(msg + "\n")
        
#Helper.logInfo("blablabla")
#Helper.logError("C'est pas bien")
Helper.logDebug("c'est un msg debug")
