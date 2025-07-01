
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {



    const token = req.header('x-auth-token') || req.header('Authorization');

    
    
    


    if (!token) {
        
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    let actualToken = token;
    if (token.startsWith('Bearer ')) {
        actualToken = token.slice(7, token.length);
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;

        
        if (!jwtSecret) {
            console.error('Auth Middleware ERROR: JWT_SECRET is NOT configured in .env or not loaded!');
            return res.status(500).json({ msg: 'Server configuration error: JWT Secret missing.' });
        }

        const decoded = jwt.verify(actualToken, jwtSecret);

        
        
        
        if (decoded.user) {
            
            
        }

        let userId = null;
        let userRole = 'user'; // Default to 'user' if not explicitly set in JWT

        if (decoded.user && decoded.user.userId) {
            userId = decoded.user.userId;
            if (decoded.user.role) {
                userRole = decoded.user.role;
            }
            
        }
        else if (decoded.user && (decoded.user.id || decoded.user._id)) {
            userId = decoded.user.id || decoded.user._id;
            if (decoded.user.role) {
                userRole = decoded.user.role;
            }
            
        } else if (decoded.id || decoded._id) {
            userId = decoded.id || decoded._id;
            if (decoded.role) {
                userRole = decoded.role;
            }
            
        }

        if (!userId) {
            console.error('Auth Middleware ERROR: Could not extract user ID from JWT payload. Decoded:', decoded);
            return res.status(401).json({ msg: 'Token is valid but user ID could not be extracted from payload.' });
        }

        req.user = { id: userId, role: userRole };
        
        

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


exports.authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        
        res.status(403).json({ message: 'Access forbidden: Admins only.' });
    }
};
