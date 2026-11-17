FROM node:20-alpine

WORKDIR /code

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "--port", "5174", "--strictPort"]
