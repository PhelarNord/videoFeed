From node:16
#Create app work dir
WORKDIR /usr/src/app

#install app dependencies
COPY package*.json ./
RUN npm install

#Bundle app source
COPY ..

EXPOSE 8080
CMD ["node", "signaling.js"]