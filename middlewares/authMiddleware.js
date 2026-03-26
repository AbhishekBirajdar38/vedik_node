import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not provided"
      });
    }

    // Decode token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach only required info
    req.user = {
      user_code: decoded.user_code,   // IMPORTANT: User reference code
      role: decoded.role,             // Optional: role from JWT
      token: token                    // Optional: raw token
    };

    next(); // Continue to controller

  } catch (error) {
    console.error("JWT Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
