Microtask Platform Backend
Project Title: Web-3 FeedBack
Overview
This is the backend for a robust microtask platform. It's built to handle user management, task creation, submission handling, and a reward system.
🚀 Features
User Management: Secure user registration, login (JWT-based), role-based access control, and user profiles.
Task Lifecycle: Full CRUD operations for tasks (create, read, update, delete), with statuses like open, claimed, and completed.
Submission & Review: Users can submit their work, which is then handled by a review and feedback system.
Reward System: Points-based rewards for completing tasks and achievements.
Future Integrations: Includes an AI verification system for submissions and a foundation for blockchain integration.
File Management: Supports file uploads for user avatars, task attachments, and submission files.
Admin Panel: Comprehensive tools for managing users, tasks, and submissions.
🛠️ Technologies Used
Backend: Node.js
Database: PostgreSQL
ORM: Sequelize
Authentication: JSON Web Tokens (JWT)

📦 Prerequisites
Before you begin, ensure you have the following installed on your machine:
Node.js (v14 or higher)
npm
PostgreSQL (version compatible with your setup)
A .env file with the correct configuration (see the Installation section).
⚙️ Installation & Setup
Clone the repository:
git clone https://github.com/Jrine0/avalanche-hack.git


Install dependencies:
npm install


Configure environment variables:
Create a .env file in the root of the project and populate it with your environment variables.
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=microtask_db
DB_USER=postgres
DB_PASSWORD="[Your Database Password Here]"

# Application Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=[Your JWT Secret Here]
FRONTEND_URL=[Your Frontend URL Here]


Set up the database:
First, ensure your PostgreSQL service is running. Then, create the database and run the schema script.
Create the database:
psql -U postgres -c "CREATE DATABASE microtask_db;"


Run the schema script:
psql -U postgres -d microtask_db -f [Path to your schema script, e.g., ./sequalise.txt]


Run the application:
node index.js

The server should now be running on http://localhost:3000.
🌐 API Endpoints
A detailed list of API endpoints is available through the Swagger/OpenAPI documentation at http://localhost:3000/api-docs.

🤝 Contributing
Contributions are welcome! If you'd like to contribute, please follow these steps:
Fork the repository.
Create a new branch (git checkout -b feature/your-feature-name).
Make your changes and commit them (git commit -m 'feat: Add new feature').
Push to the branch (git push origin feature/your-feature-name).
Open a Pull Request.
📝 License
This project is licensed under the [Your License Here] License.
📧 Contact
For any questions or suggestions, please contact [Your Name Here] at [Your Email Here].
