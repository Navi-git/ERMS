from rest_framework.exceptions import APIException


class ApiError(APIException):
    """Business-rule error with a stable machine-readable `code` the frontend can switch on.

    Response body:  {"code": "invalid_otp", "message": "Invalid or expired code."}
    """

    def __init__(self, code, message, status_code=400):
        self.status_code = status_code
        super().__init__(detail={"code": code, "message": message})
