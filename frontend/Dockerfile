# Use a Node.js image
FROM node:lts-alpine as build-stage

# Define the work directory in the container
WORKDIR /app

# Copy the files package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the sources files in the container
COPY . .

# Build command
RUN npm run build

FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Run command
CMD ["nginx", "-g", "daemon off;"]


