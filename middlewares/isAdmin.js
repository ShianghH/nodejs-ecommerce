const FORBIDDEN_MESSAGE = "使用者尚未成為管理者";
const PERMISSION_DENIED_STATUS_CODE = 401;

function generateError(
  status = PERMISSION_DENIED_STATUS_CODE,
  message = FORBIDDEN_MESSAGE
) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    next(generateError());
    return;
  }
  next();
};
