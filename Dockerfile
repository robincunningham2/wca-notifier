FROM node:latest

WORKDIR /app
COPY . .
RUN npm install --only=prod

EXPOSE 3000/tcp
EXPOSE 3000/udp

CMD node .
