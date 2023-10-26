const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  // Get the token from the request, e.g., from headers or cookies
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, 'your_secret_key'); // Replace with your actual secret key
    req.user = decoded.user; // Make the user object available in the request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authenticateUser;
