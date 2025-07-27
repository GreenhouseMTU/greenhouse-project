# Use a Python image
FROM python:3.8

# Set timezone and install basic tools
RUN ln -sf /usr/share/zoneinfo/Europe/Dublin /etc/localtime && echo "Europe/Dublin" > /etc/timezone && \
    apt-get update && apt-get install -y iputils-ping curl gnupg

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean

# Verify Node.js installation
RUN node -v && npm -v

# Define the work directory inside of the container
WORKDIR /app

# Copy the project files inside of the container
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
RUN npm install

# Expose the port
EXPOSE 8080

# Start command
CMD ["python", "app.py"]
