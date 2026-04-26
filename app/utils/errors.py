from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, resource: str = "资源"):
        super().__init__(f"{resource}不存在", 404)


class DuplicateError(AppError):
    def __init__(self, resource: str = "资源"):
        super().__init__(f"{resource}已存在", 409)


async def app_error_handler(request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.message})
