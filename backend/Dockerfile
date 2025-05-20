# Use a Python image
FROM python:3.8

# Install ping tool
RUN apt-get update && apt-get install -y iputils-ping

# Define the work directory inside of the container
WORKDIR /app

# Copy the projects files inside of the container
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port
EXPOSE 8080

# Start command
CMD ["python", "app.py"]
