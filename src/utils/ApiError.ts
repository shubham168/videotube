class ApiError<T> extends Error {
  statusCode: any;
  data: null;
  success: boolean;
  errors: Array<T>;
  message: string;
  constructor(
    statusCode: any,
    message = "Something went wrong",
    errors = [],
    stack: string | undefined = ""
  ) {
    console.log(message)
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
