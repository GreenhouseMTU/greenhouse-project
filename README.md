In this repository you will find a backend and a frontend for the Nimbus Research Centre greenhouse project.

## Ports
-The backend use the port 8080, you can change it in backend/DockerFile

-The frontend use the port 8079, you can change it in frontend/DockerFile

-Database: MariaDB runs on port '3306' (configurable in 'docker-compose.yml')

Database credentials and environment variables are set in docker-compose.yml and backend/app.py.
TTN integration settings can be configured in the backend source code (ttn.py).

-To open the MariaDB database locally (from your terminal), use the following command: docker exec -it db-greenhouse mysql -u root -p
-Then enter the password (adminNIMBUS-1 by default, as set in your docker-compose.yml).


### 1. Check if the database is running with docker

Open a terminal in VS Code and run:
```bash
docker ps
```
If no MariaDB container is running, start the database:
```bash
docker-compose up -d db
```

---

### 2. Start the backend

Open a **new terminal** in VS Code, then run:
```bash
cd backend
.\venv\bin\Activate   
python app.py
```

---

### 3. Start the frontend

Open **another terminal** in VS Code, then run:
```bash
cd frontend
npm run dev
```

---

---

### 3.5. Expose the backend to the internet with ngrok (for TTN integration)

To allow TTN to reach your backend API from the internet, you can use ngrok:

1. Open a **new terminal** in VS Code.
2. Change directory to where `ngrok.exe` is located:
   ```bash
   cd C:\Users\teaPOT\Desktop\greenhouse-project\Ngrok
   ```
3. Start ngrok to expose your backend (port 8080):
   ```bash
   ngrok.exe http 8080
   ```
4. Copy the `Forwarding` URL provided by ngrok (e.g., `https://xxxx-xx-xx-xx-xx.ngrok-free.app`) and paste it into the TTN webhook configuration.

> **Note:**  
> - As long as you keep this terminal open, the forwarding link remains valid.
> - If you close the terminal, you will need to rerun the ngrok command to get a new link and update it in TTN.

---

### 4. Access the application

- Go to [http://localhost:8079](http://localhost:8079) in your browser.
- Log in or create an account to access the Home page
- View real-time and historical sensor data and export measurements in Dashboard page
- Manage greenhouse tasks and get information on the

### 4. Access the application

- Go to [http://localhost:8079](http://localhost:8079) in your browser.
-Log in or create an account to access the Home page
-View real-time and historical sensor data and export measurements in Dashboard page
-Manage greenhouse tasks and get information on the Highlight page

---

## First-time setup on a new computer

If you are running the project for the first time on a new machine:

1. **Install backend dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **(Optional) Rebuild Docker images:**
Make sure you have [Docker](https://www.docker.com/) installed, then run:

docker-compose up --build

4. **Then follow the Quick Start steps above.**

-----


## What is done : 

- Retrieving data from the TTN
- Save and store data in database
- Data filtering for endpoints (day, week, month, etc.)
- Frontend login page
- Frontend Home page
- Frontend Dashboard page
- Frontend Highlight pages

## What remains to be done: 

- Configure proxy and SSL certificate for production deployment.
- Add more advanced visualizations and analytics to the Highlight page.

## Important note:  
In this repository, files are configured to run **local (localhost)**.  
When deploying to the server, all occurrences of `localhost` were replaced with the IP of the virtual machine: `172.31.1.13`.

Additionally, in the file backend/sensorCO2TempHumInt.py, the following line was updated to match the server's file system structure:

cwd=r'C:\Users\teaPOT\Desktop\greenhouse-project\backend' 

was changed to:

cwd='/home/greenlab/greenhouse-project/backend' 




