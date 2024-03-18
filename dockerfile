FROM node:18-alpine

# Définissez le répertoire de travail dans le conteneur
WORKDIR /app

# Copiez les fichiers package.json et package-lock.json
COPY package*.json ./

# Installez les dépendances
RUN npm install

# Copiez le reste des fichiers de l'application
COPY . .

# Exposez le port sur lequel votre application s'exécute
EXPOSE 1605

# Commande pour exécuter l'application
CMD ["npm", "run", "start"]
