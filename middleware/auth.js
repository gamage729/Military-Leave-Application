const admin = require('firebase-admin');

// In-memory cache for authentication results
const authCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

// Clean up expired cache entries
const cleanupCache = () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of authCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            authCache.delete(key);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired auth cache entries`);
    }
};

// Periodic cache cleanup
setInterval(cleanupCache, 2 * 60 * 1000); // Clean every 2 minutes

const authenticateToken = async (req, res, next) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting authentication...`);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No auth header found');
        return res.status(401).json({ 
            success: false,
            error: 'Unauthorized',
            details: 'Missing or invalid Authorization header'
        });
    }

    const token = authHeader.split(' ')[1];
    
    // Create cache key from token hash (first 50 chars for security)
    const cacheKey = token.substring(0, 50);
    
    try {
        // Check cache first
        const cachedAuth = authCache.get(cacheKey);
        if (cachedAuth && Date.now() - cachedAuth.timestamp < CACHE_DURATION) {
            req.user = cachedAuth.user;
            console.log(`[${new Date().toISOString()}] Authentication from cache for user:`, cachedAuth.user.uid, `(${Date.now() - startTime}ms)`);
            return next();
        }

        console.log('Verifying token...');
        const decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Token verified for user:', decodedToken.uid);
        
        console.log('Fetching user document...');
        const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            console.log('User document not found');
            return res.status(403).json({ 
                success: false,
                error: 'Forbidden',
                details: 'User not registered in database'
            });
        }

        // Create user object
        const user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            ...userDoc.data()
        };

        // Cache the authentication result
        if (authCache.size >= MAX_CACHE_SIZE) {
            // Remove oldest entries if cache is full
            const oldestKey = authCache.keys().next().value;
            authCache.delete(oldestKey);
        }
        
        authCache.set(cacheKey, {
            user,
            timestamp: Date.now()
        });

        // Attach user to request
        req.user = user;

        console.log(`[${new Date().toISOString()}] Authentication successful for user:`, decodedToken.uid, `(${Date.now() - startTime}ms)`);
        next();
        
    } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.code === 'auth/id-token-expired') {
            // Remove from cache if token expired
            authCache.delete(cacheKey);
            return res.status(401).json({ 
                success: false,
                error: 'Token expired',
                details: 'Please refresh your token'
            });
        }
        
        return res.status(403).json({
            success: false,
            error: 'Authentication failed',
            details: error.message
        });
    }
};

module.exports = { authenticateToken };