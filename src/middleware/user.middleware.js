import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  // console.log("Token from cookies:", token);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    console.log("unathorize")
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie("token");

    return res.status(401).json({
      success: false,
      message: "Token has expired or is invalid.",
    });
    console.log("unathorize")

  }
};

export default verifyToken;