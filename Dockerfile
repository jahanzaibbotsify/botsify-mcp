FROM node:18
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV NODE_ENV="production"
CMD ["node", "dist/index.js"]