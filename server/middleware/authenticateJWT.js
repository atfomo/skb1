// backend/middleware/authenticateJWT.js (SIMPLIFIED)
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // This middleware now only handles JWT authentication.
    // The logic for bot secrets is handled in server.js's apiRouter middleware.

    const token = req.header('x-auth-token') || req.header('Authorization');

    console.log('\n--- AUTHENTICATE JWT MIDDLEWARE DEBUG (Simplified) ---');
    console.log('Auth Middleware: Incoming token header:', token ? 'Present' : 'Absent');
    console.log('Auth Middleware: Request Path:', req.path);


    if (!token) {
        console.log('Auth Middleware: No token found. Returning 401.');
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    let actualToken = token;
    if (token.startsWith('Bearer ')) {
        actualToken = token.slice(7, token.length);
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;

        console.log('Auth Middleware: JWT Secret loaded from process.env:', jwtSecret ? 'Present' : 'Absent');
        if (!jwtSecret) {
            console.error('Auth Middleware ERROR: JWT_SECRET is NOT configured in .env or not loaded!');
            return res.status(500).json({ msg: 'Server configuration error: JWT Secret missing.' });
        }

        const decoded = jwt.verify(actualToken, jwtSecret);

        console.log('Auth Middleware: RAW DECODED TOKEN PAYLOAD:', decoded);
        console.log('Auth Middleware: Type of decoded:', typeof decoded);
        console.log('Auth Middleware: Does decoded have .user?', 'user' in decoded);
        if (decoded.user) {
            console.log('Auth Middleware: Does decoded.user have .userId?', 'userId' in decoded.user);
            console.log('Auth Middleware: Does decoded.user have .role?', 'role' in decoded.user);
        }

        let userId = null;
        let userRole = 'user'; // Default to 'user' if not explicitly set in JWT

        if (decoded.user && decoded.user.userId) {
            userId = decoded.user.userId;
            if (decoded.user.role) {
                userRole = decoded.user.role;
            }
            console.log('Auth Middleware: User ID extracted from decoded.user.userId');
        }
        else if (decoded.user && (decoded.user.id || decoded.user._id)) {
            userId = decoded.user.id || decoded.user._id;
            if (decoded.user.role) {
                userRole = decoded.user.role;
            }
            console.log('Auth Middleware: User ID extracted from decoded.user.id/._id');
        } else if (decoded.id || decoded._id) {
            userId = decoded.id || decoded._id;
            if (decoded.role) {
                userRole = decoded.role;
            }
            console.log('Auth Middleware: User ID extracted from decoded.id/._id (top level)');
        }

        if (!userId) {
            console.error('Auth Middleware ERROR: Could not extract user ID from JWT payload. Decoded:', decoded);
            return res.status(401).json({ msg: 'Token is valid but user ID could not be extracted from payload.' });
        }

        req.user = { id: userId, role: userRole };
        console.log('Auth Middleware: User ID set to req.user.id:', req.user.id);
        console.log('Auth Middleware: User Role set to req.user.role:', req.user.role);

        next();
    } catch (err) {
        console.error('Auth Middleware ERROR: Token verification failed:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: 'Token expired' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ msg: 'Token is invalid (malformed or bad signature)' });
        }
        res.status(500).json({ msg: 'Server Error during token verification' });
    }
};

// authorizeAdmin middleware (remains the same)
exports.authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.log(`Auth Middleware: Unauthorized access attempt by user ID ${req.user ? req.user.id : 'N/A'} (Role: ${req.user ? req.user.role : 'N/A'})`);
        res.status(403).json({ message: 'Access forbidden: Admins only.' });
    }
};
