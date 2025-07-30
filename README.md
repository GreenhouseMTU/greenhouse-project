In this repository you will find a backend and a frontend for the Nimbus Research Centre greenhouse project.

## Ports
-The backend use the port 8080, you can change it in backend/DockerFile

-The frontend use the port 8079, you can change it in frontend/DockerFile

-Database: MariaDB runs on port '3306' (configurable in 'docker-compose.yml')

Database credentials and environment variables are set in docker-compose.yml and backend/app.py.
TTN integration settings can be configured in the backend source code (ttn.py).


## Getting Started

### 1. With Docker (recommended)

Make sure you have [Docker](https://www.docker.com/) installed, then run:

docker-compose up --build

### 2. Locally (development mode)

-Backend :  

cd backend -> pip install -r requirements.txt -> python app.py
The backend will run on port 8080 by default.

-Frontend : 

cd frontend -> npm install -> npm run dev
The frontend will run on port 8079 by default.

-To open the MariaDB database locally (from your terminal), use the following command: mysql -h 127.0.0.1 -P 3306 -u root -p
-Then enter the password (adminNIMBUS-1 by default, as set in your docker-compose.yml).


## What is done : 

- Retrieving data from the TTN
- Save and store data in database
- Data filtering for endpoints (day, week, month, etc.)
- Frontend login page
- Frontend Home page
- Frontend Dashboard page
- Frontend Highlight page

## What remains to be done: 

- Configure proxy and SSL certificate for production deployment.
- Add more advanced visualizations and analytics to the Highlight page.


## Usage

-Access the web interface at http://localhost:8079
-Log in or create an account to access the Home page
-View real-time and historical sensor data and export measurements in Dashboard page
-Manage greenhouse tasks and get information on the Highlight page