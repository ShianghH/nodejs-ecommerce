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
  // 支援 roles 陣列，例如 ['user', 'admin']
  const roles = req.user?.roles?.map((r) => r.rolename) || [];
  if (!roles.includes("admin")) {
    next(generateError());
    return;
  }
  next();
};
