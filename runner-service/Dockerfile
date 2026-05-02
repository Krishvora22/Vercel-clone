FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install
RUN apk add --no-cache docker-cli git

COPY . .
RUN npm run build

CMD ["npm", "start"]
