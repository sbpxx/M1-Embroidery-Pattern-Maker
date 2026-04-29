#!/bin/bash
# setup.sh - Script to set up the environment for the project
#verifier si le nombre d'arguments est correct
#31 = rouge
#32 = vert
#33 = jaune

if [ $# -ne 1 ]; then
    echo -e "\E[31mUsage: $0 <chemin installation> \E[0m"
    exit 1
fi
echo -e "\E[32mChemin d'installation: $1\E[0m"
current_dir=$(pwd)
install_dir=$1
cd $install_dir

# Vérifier si python3 est disponible, sinon utiliser python
if command -v python3 &>/dev/null; then
    echo -e "\E[33mPython 3 detecté\E[0m"    
    PYTHON=python3
else
echo -e "\E[33mPython 3 non detecté passage en Python\E[0m"
    PYTHON=python
fi

# Installation de python3.11
echo -e "\E[32mInstallation de l'environement \E[0m"
$PYTHON -m venv lesbrodeurs-appPython

#apt install python3.11-venv
#python3 -m venv lesbrodeurs-appPython
#recuperer le chemin actuel

cd lesbrodeurs-appPython/
source bin/activate
#installation des packages
echo -e "\E[32mInstallation des packages \E[0m"

install_package() {
    package=$1
    echo -e "\E[32mInstallation $package \E[0m"
    if ! pip show $package &>/dev/null; then
        pip install $package
        if [ $? -ne 0 ]; then
            echo -e "\E[31mErreur lors de l'installation de $package\E[0m"
            exit 1
        fi
    else
        echo -e "\E[33m$package est déjà installé, vérification de maj\E[0m"
        #mettre a jour
        pip install --upgrade $package
    fi
}

# Installation des packages
install_package python-dotenv
install_package opencv-python
install_package matplotlib
install_package scikit-learn
install_package kneed
install_package pandas
install_package Flask-Cors
install_package psycopg2-binary
install_package gensim
install_package deep-translator


# Copier le fichier app.py dans le dossier lesbrodeurs-appPython
echo -e "\E[32mCopie du projet \E[0m"
echo "current : $current_dir"
echo "installation : $install_dir"
cp -r $current_dir/Projet $install_dir/lesbrodeurs-appPython/
if [ $? -ne 0 ]; then
    echo "Erreur dans le copiage"
    exit 1
fi
echo "current : $current_dir"
echo "installation : $install_dir"
cd $install_dir/lesbrodeurs-appPython/Projet
# Lancer le serveur
echo -e "\E[32mLancement du serveur \E[0m"
python app.py