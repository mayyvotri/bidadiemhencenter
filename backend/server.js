import dotenv from 'dotenv';
import app from './app.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5001;

// Start listening
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
  console.log(`=============================================`);
});
