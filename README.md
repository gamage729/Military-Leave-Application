In the /backend directory, you can run:

npm start
Runs the backend server in development mode.

URL: http://localhost:5001

Automatically restarts the server on file changes if using nodemon.

Make sure Firebase and environment configs are set properly.

npm run dev (if using nodemon)
Starts the server using nodemon for live-reloading.
Install it globally if not already:

npm install -g nodemon


npm run dev
npm test
Runs backend test suites (if available).

Environment Setup (Optional)
Make sure you have a .env file in /backend with keys like:
PORT=5001
FIREBASE_PROJECT_ID=your-firebase-id
FIREBASE_PRIVATE_KEY=your-private-key
JWT_SECRET=your-secret-key
