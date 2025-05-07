FROM node:20-alpine

WORKDIR /src

# Install dependencies first (better caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application
COPY . .

ENV NEXT_PUBLIC_API_BASE_URL=http://backend:5001

EXPOSE 3000

CMD ["npm", "run", "dev"]