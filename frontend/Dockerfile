FROM node:18-alpine

WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV PORT=9904

EXPOSE 9904

CMD ["node", "server.js"]