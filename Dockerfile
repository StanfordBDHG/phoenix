# We are using a multi-stage build to keep our final image clean and small

# Stage 1: Build a temporary image
FROM node:16 as build

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build app
RUN npm run build --if-present

# Stage 2: Copy the output from the temporary image to a smaller base image
FROM nginx:alpine

# Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Update nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy build folder from build stage to nginx public folder
COPY --from=build /app/build /usr/share/nginx/html/phoenix

# Expose port 80
EXPOSE 80